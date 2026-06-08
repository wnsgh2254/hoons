-- Product categories for inventory (separate from brand/분류)
CREATE TABLE IF NOT EXISTS inventory_product_categories (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL DEFAULT 3,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, name)
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_categories_shop_id
  ON inventory_product_categories (shop_id);

ALTER TABLE inventory_product_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inventory_product_categories'
      AND policyname = 'Allow all on inventory_product_categories'
  ) THEN
    CREATE POLICY "Allow all on inventory_product_categories"
      ON inventory_product_categories FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
