-- Comment: Customer-facing note for reservation booking items (admin: /admin/settings/reservation)
ALTER TABLE public.booking_items ADD COLUMN IF NOT EXISTS memo text;
COMMENT ON COLUMN public.booking_items.memo IS 'Memo shown to customers on the public booking page';
