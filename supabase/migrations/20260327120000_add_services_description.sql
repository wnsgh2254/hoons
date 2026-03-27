-- Comment: Short description for customer booking page (admin-managed)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS description text;
COMMENT ON COLUMN public.services.description IS 'Short description shown to customers on the booking page';
