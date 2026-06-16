-- Speed up sales reports filtered by date range and sales_items lookups by sale_id.
CREATE INDEX IF NOT EXISTS sales_sales_date_id_idx
  ON public.sales (sales_date ASC, id ASC);

CREATE INDEX IF NOT EXISTS sales_shop_id_sales_date_idx
  ON public.sales (shop_id, sales_date ASC, id ASC);

CREATE INDEX IF NOT EXISTS sales_items_sale_id_idx
  ON public.sales_items (sale_id);
