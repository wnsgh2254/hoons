-- Link each sale to the booking it was registered from (walk-in / shared-customer disambiguation).
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS booking_id bigint REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sales_booking_id_idx
  ON public.sales (booking_id)
  WHERE booking_id IS NOT NULL;

-- Backfill exact date+time matches for completed bookings (legacy rows).
UPDATE public.sales s
SET booking_id = matched.booking_id
FROM (
  SELECT s2.id AS sale_id, b.id AS booking_id
  FROM public.sales s2
  JOIN public.bookings b
    ON b.customer_id = s2.customer_id
   AND b.booking_date = s2.sales_date
   AND COALESCE(b.sale_completed, 0) = 1
   AND LEFT(COALESCE(b.booking_time::text, '00:00'), 5) = LEFT(COALESCE(s2.sales_time, '00:00'), 5)
  WHERE s2.booking_id IS NULL
    AND s2.customer_id IS NOT NULL
) matched
WHERE s.id = matched.sale_id
  AND s.booking_id IS NULL;
