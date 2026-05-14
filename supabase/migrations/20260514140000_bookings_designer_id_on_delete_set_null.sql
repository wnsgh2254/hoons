-- Allow deleting a designer while keeping booking rows: clear designer reference instead of blocking.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_designer_id_fkey;

ALTER TABLE public.bookings
  ALTER COLUMN designer_id DROP NOT NULL;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_designer_id_fkey
  FOREIGN KEY (designer_id)
  REFERENCES public.designers(id)
  ON DELETE SET NULL;
