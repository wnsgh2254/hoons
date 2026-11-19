-- Support stacking a second discount (e.g. cash discount + promo discount) per sale line item.
ALTER TABLE public.sales_items
  ADD COLUMN IF NOT EXISTS discount_type_2 TEXT,
  ADD COLUMN IF NOT EXISTS discount_value_2 TEXT;
