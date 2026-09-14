-- BE-2 item 1: payment_tenders.method only allowed 'account' or 'cash' —
-- no slot for 'card' at all, despite both create_pending_payment and
-- settle_payment already handling the method column completely
-- generically (confirmed by reading both function bodies directly).
-- This was the single blocker behind BE-3 items 3, 5, and 6.
--
-- No new columns needed: raw card details are never stored (PCI DSS) —
-- only the masked number the bank returns, which already fits in the
-- existing account_ref column.

ALTER TABLE payment_tenders DROP CONSTRAINT payment_tenders_method_check;

ALTER TABLE payment_tenders
  ADD CONSTRAINT payment_tenders_method_check
  CHECK (method = ANY (ARRAY['account'::text, 'cash'::text, 'card'::text]));
