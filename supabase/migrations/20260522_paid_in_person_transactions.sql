alter type public.transaction_payment_status
  add value if not exists 'paid_in_person';
