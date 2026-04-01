-- Change bookings -> services foreign key to cascade deletes.
-- This allows deleting a service even when bookings reference it.
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_service_id_fkey;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_service_id_fkey
FOREIGN KEY (service_id)
REFERENCES public.services(id)
ON DELETE CASCADE;
