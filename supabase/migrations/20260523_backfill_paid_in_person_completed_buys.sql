update public.transactions
set payment_status = 'paid_in_person'::public.transaction_payment_status
where status = 'completed'::public.transaction_status
  and request_type = 'buy'::public.transaction_request_type
  and payment_status in (
    'unpaid'::public.transaction_payment_status,
    'failed'::public.transaction_payment_status
  )
  and paid_at is null;
