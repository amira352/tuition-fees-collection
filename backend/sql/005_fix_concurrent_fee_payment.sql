-- Widen fees.status to allow 'processing' — a fee gets atomically claimed
-- into this state the moment a payment attempt starts, and released back
-- to 'unpaid'/'partially_paid' if that attempt fails, or moved to 'paid'
-- once it settles. This is the real fix for two parents paying the same
-- fee at once: the previous FOR UPDATE lock in create_pending_payment
-- released the moment that function returned, leaving the fee unprotected
-- for the entire external bank-call window that follows.
ALTER TABLE fees DROP CONSTRAINT fees_status_check;

ALTER TABLE fees
  ADD CONSTRAINT fees_status_check
  CHECK (status = ANY (ARRAY['unpaid'::text, 'partially_paid'::text, 'paid'::text, 'processing'::text]));

CREATE OR REPLACE FUNCTION public.create_pending_payment(p_parent_id uuid, p_employee_id uuid, p_payment_type text, p_items jsonb, p_tenders jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_payment_id  uuid;
  v_items_sum   numeric;
  v_tenders_sum numeric;
  v_item        jsonb;
  v_tender      jsonb;
  v_fee         fees%rowtype;
begin
  select coalesce(sum((value->>'amount')::numeric), 0)
    into v_items_sum from jsonb_array_elements(p_items);

  select coalesce(sum((value->>'amount')::numeric), 0)
    into v_tenders_sum from jsonb_array_elements(p_tenders);

  if v_items_sum <= 0 then
    raise exception 'payment must be more than zero';
  end if;

  if v_items_sum <> v_tenders_sum then
    raise exception 'accounts add up to % but the fee lines add up to %',
      v_tenders_sum, v_items_sum;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    update fees
       set status = 'processing'
     where id = (v_item->>'fee_id')::uuid
       and status not in ('paid', 'processing')
    returning * into v_fee;

    if not found then
      select * into v_fee from fees where id = (v_item->>'fee_id')::uuid;
      if not found then
        raise exception 'fee % does not exist', v_item->>'fee_id';
      elsif v_fee.status = 'paid' then
        raise exception 'fee % has already been settled', v_fee.id;
      else
        raise exception 'fee % is already being paid by another request', v_fee.id;
      end if;
    end if;

    if (v_item->>'amount')::numeric > v_fee.outstanding_amount then
      raise exception 'cannot pay % against fee % which has % outstanding',
        v_item->>'amount', v_fee.id, v_fee.outstanding_amount;
    end if;

    perform 1 from children
     where id = v_fee.child_id and parent_id = p_parent_id;

    if not found then
      raise exception 'fee % does not belong to this parent', v_fee.id;
    end if;
  end loop;

  insert into payments
    (parent_id, amount, payment_type, payment_method,
     processed_by_employee_id, status)
  values
    (p_parent_id, v_items_sum, p_payment_type, 'debit/credit',
     p_employee_id, 'pending')
  returning id into v_payment_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into payment_items (payment_id, fee_id, amount)
    values (v_payment_id, (v_item->>'fee_id')::uuid, (v_item->>'amount')::numeric);
  end loop;

  for v_tender in select * from jsonb_array_elements(p_tenders) loop
    insert into payment_tenders (payment_id, method, account_ref, amount)
    values (v_payment_id, v_tender->>'method', v_tender->>'account_ref', (v_tender->>'amount')::numeric);
  end loop;

  return v_payment_id;
end;
$function$;