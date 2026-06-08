-- Legacy: 분류(brand) names were stored only in category before brand was saved via API.
UPDATE inventory_items AS i
SET brand = i.category
WHERE (i.brand IS NULL OR TRIM(i.brand) = '')
  AND i.category IS NOT NULL
  AND TRIM(i.category) <> ''
  AND EXISTS (
    SELECT 1
    FROM inventory_brands AS b
    WHERE b.name = i.category
      AND b.shop_id = i.shop_id
  );
