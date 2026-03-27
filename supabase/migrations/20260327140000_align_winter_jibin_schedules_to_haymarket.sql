-- Comment: Align Winter (23) & Jibin (24) with Haymarket (4); remove stray Meadowbank links
-- Shops: id 3 = Meadowbank, id 4 = Haymarket

UPDATE public.designer_schedules
SET shop_id = 4
WHERE designer_id IN (23, 24)
  AND shop_id = 3;

DELETE FROM public.designer_shops
WHERE designer_id IN (23, 24)
  AND shop_id = 3;
