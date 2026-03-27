-- Comment: Winter (23) had Tue/Wed/Thu/Sat only — add Friday (weekday 5) at Haymarket to match other Haymarket designers
-- JS weekday: 0=Sun … 5=Fri … 6=Sat

INSERT INTO public.designer_schedules (designer_id, shop_id, weekday, start_time, end_time, effective_from, effective_to)
SELECT 23, 4, 5, '10:00:00', '19:00:00', '2026-01-05', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.designer_schedules
  WHERE designer_id = 23 AND shop_id = 4 AND weekday = 5 AND effective_to IS NULL
);
