-- Allow deleting a designer while keeping historical sales/booking rows.
-- sales_items.manager keeps the display name; designer_id is cleared instead of blocking delete.

-- sales_items.designer_id
ALTER TABLE public.sales_items DROP CONSTRAINT IF EXISTS sales_items_designer_id_fkey;

ALTER TABLE public.sales_items
  ALTER COLUMN designer_id DROP NOT NULL;

ALTER TABLE public.sales_items
  ADD CONSTRAINT sales_items_designer_id_fkey
  FOREIGN KEY (designer_id)
  REFERENCES public.designers(id)
  ON DELETE SET NULL;

-- bookings.designer_id (idempotent — may already exist from prior migration)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_designer_id_fkey;

ALTER TABLE public.bookings
  ALTER COLUMN designer_id DROP NOT NULL;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_designer_id_fkey
  FOREIGN KEY (designer_id)
  REFERENCES public.designers(id)
  ON DELETE SET NULL;

-- payments.designer_id
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_designer_id_fkey;

ALTER TABLE public.payments
  ALTER COLUMN designer_id DROP NOT NULL;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_designer_id_fkey
  FOREIGN KEY (designer_id)
  REFERENCES public.designers(id)
  ON DELETE SET NULL;
