-- Run this before every run of test-payments.sh.
-- Wipes the test parent's payments and puts the three test fees back to unpaid.

delete from payment_tenders
 where payment_id in (select id from payments
                       where parent_id = '11111111-1111-1111-1111-111111111111');

delete from payment_items
 where payment_id in (select id from payments
                       where parent_id = '11111111-1111-1111-1111-111111111111');

delete from payments
 where parent_id = '11111111-1111-1111-1111-111111111111';

insert into fees (id, child_id, fee_type, period, amount, outstanding_amount, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '33333333-3333-3333-3333-333333333333', 'tuition', 'TEST', 8500, 8500, 'unpaid'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '44444444-4444-4444-4444-444444444444', 'bus', 'TEST', 2450, 2450, 'unpaid'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '33333333-3333-3333-3333-333333333333', 'books', 'TEST', 1000, 1000, 'unpaid'),
  -- never settled by any test. the negative tests need a fee that is still
  -- payable, otherwise they fail on "already settled" and prove nothing.
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '33333333-3333-3333-3333-333333333333', 'activities', 'TEST', 5000, 5000, 'unpaid')
on conflict (id) do nothing;

update fees
   set outstanding_amount = amount, status = 'unpaid'
 where id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
              'cccccccc-cccc-cccc-cccc-cccccccccccc',
              'dddddddd-dddd-dddd-dddd-dddddddddddd');

select id, fee_type, amount, outstanding_amount, status
  from fees
 where period = 'TEST'
 order by fee_type;
