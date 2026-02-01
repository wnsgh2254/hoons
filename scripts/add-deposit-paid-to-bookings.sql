-- Add deposit_paid column to bookings table.
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor) once.
-- After Stripe webhook runs on payment_intent.succeeded, we set status = 'confirmed' and deposit_paid = amount paid (AUD).
-- Staff can compute remaining balance as: total_amount - deposit_paid

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS deposit_paid numeric DEFAULT NULL;

COMMENT ON COLUMN bookings.deposit_paid IS 'Amount actually paid as deposit (AUD), set by Stripe webhook on payment_intent.succeeded. Remaining = total_amount - deposit_paid.';
