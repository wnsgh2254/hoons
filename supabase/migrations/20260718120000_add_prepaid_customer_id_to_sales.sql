-- Track which customer's prepaid balance was deducted on a sale
-- (may differ from sales.customer_id when using another person's pass).
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS prepaid_customer_id bigint REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sales_prepaid_customer_id_idx
  ON public.sales (prepaid_customer_id)
  WHERE prepaid_customer_id IS NOT NULL;

COMMENT ON COLUMN public.sales.prepaid_customer_id IS
  'Customer whose prepaid_passes balance was deducted (may differ from customer_id when using another person''s pass).';
