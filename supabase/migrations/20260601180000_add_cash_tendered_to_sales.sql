-- Physical cash received from customer when it exceeds applied cash_amount (change due).
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS cash_tendered numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sales.cash_tendered IS 'Cash received from customer (AUD); when greater than cash_amount, difference is change returned.';
