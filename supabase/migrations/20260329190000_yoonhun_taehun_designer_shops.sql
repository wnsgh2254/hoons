-- Link 윤훈 & 태훈 to both Meadowbank (3) and Haymarket (4) via designer_shops.
-- Shops: id 3 = Meadowbank, id 4 = Haymarket (see prior migrations).

INSERT INTO public.designer_shops (designer_id, shop_id, is_active)
SELECT d.id, v.sid, true
FROM public.designers d
CROSS JOIN (VALUES (3), (4)) AS v(sid)
WHERE d.name IN ('윤훈', '태훈')
  AND NOT EXISTS (
    SELECT 1
    FROM public.designer_shops ds
    WHERE ds.designer_id = d.id AND ds.shop_id = v.sid
  );
