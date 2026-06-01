-- Snapshot of booking deposit credited when the sale was registered (AUD).
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS paid_deposit numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sales.paid_deposit IS 'Deposit amount credited on this sale at registration time (AUD); snapshot even if booking.deposit_paid changes later.';
