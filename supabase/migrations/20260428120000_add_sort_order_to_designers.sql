-- Add sort_order column to designers table for booking resource ordering
ALTER TABLE designers ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Initialize sort_order based on current alphabetical order
WITH ordered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY name) - 1) AS rn
  FROM designers
)
UPDATE designers SET sort_order = ordered.rn
FROM ordered
WHERE designers.id = ordered.id;
