-- Run before every run of test-idempotency.sh.

delete from payment_idempotency where idempotency_key like 'test-key-%';

delete from payment_idempotency
 where payment_id in (select id from payments
                       where parent_id = '11111111-1111-1111-1111-111111111111');

delete from payment_tenders
 where payment_id in (select id from payments
                       where parent_id = '11111111-1111-1111-1111-111111111111');
delete from payment_items
 where payment_id in (select id from payments
                       where parent_id = '11111111-1111-1111-1111-111111111111');
delete from payments
 where parent_id = '11111111-1111-1111-1111-111111111111';

insert into fees (id, child_id, fee_type, period, amount, outstanding_amount, status)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        '33333333-3333-3333-3333-333333333333', 'activities', 'IDEM', 3000, 3000, 'unpaid'),
       -- the decline test needs a fee the earlier steps have not settled
       ('ffffffff-ffff-ffff-ffff-ffffffffffff',
        '33333333-3333-3333-3333-333333333333', 'books', 'IDEM', 500, 500, 'unpaid')
on conflict (id) do nothing;

update fees set outstanding_amount = amount, status = 'unpaid'
 where id in ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
              'ffffffff-ffff-ffff-ffff-ffffffffffff');

select id, fee_type, period, amount, outstanding_amount, status
  from fees where period = 'IDEM' order by fee_type;
