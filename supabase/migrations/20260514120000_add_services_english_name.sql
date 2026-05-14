-- Optional English label for customer-facing pages (e.g. My Booking).
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS english_name text;
COMMENT ON COLUMN public.services.english_name IS 'English display name for customers; overrides automatic translation when set.';
