-- Backfill Haymarket (shop 4) catalog fields from Meadowbank (shop 3) for mirrored products.
-- Matches by SKU when present, otherwise by name + brand + category.
-- Does not delete Haymarket-only rows (shop_id=4 items without a Meadowbank mirror).

UPDATE inventory_items AS haymarket
SET
  name = meadowbank.name,
  size = meadowbank.size,
  sku = meadowbank.sku,
  category = meadowbank.category,
  brand = meadowbank.brand,
  price = meadowbank.price,
  cost_price = meadowbank.cost_price,
  icon = meadowbank.icon,
  for_internal = meadowbank.for_internal,
  for_retail = meadowbank.for_retail,
  status = meadowbank.status
FROM inventory_items AS meadowbank
WHERE meadowbank.shop_id = 3
  AND haymarket.shop_id = 4
  AND (
    (
      meadowbank.sku IS NOT NULL
      AND btrim(meadowbank.sku) <> ''
      AND haymarket.sku = meadowbank.sku
    )
    OR (
      (meadowbank.sku IS NULL OR btrim(meadowbank.sku) = '')
      AND (haymarket.sku IS NULL OR btrim(haymarket.sku) = '')
      AND haymarket.name = meadowbank.name
      AND haymarket.category = meadowbank.category
      AND coalesce(btrim(haymarket.brand), '') = coalesce(btrim(meadowbank.brand), '')
    )
  );
