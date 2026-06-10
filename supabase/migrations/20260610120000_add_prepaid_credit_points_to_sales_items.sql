-- Store prepaid credit issued per line so sale delete can reverse the balance accurately.
ALTER TABLE public.sales_items
  ADD COLUMN IF NOT EXISTS prepaid_credit_points NUMERIC DEFAULT 0;
