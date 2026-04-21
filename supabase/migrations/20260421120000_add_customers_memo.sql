-- Add memo column to customers for storing customer-level notes shown in the customer info drawer.
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS memo TEXT;
