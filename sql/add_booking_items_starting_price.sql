-- Add starting price (AUD) for customer deposit / public booking when using booking_items
ALTER TABLE booking_items
  ADD COLUMN IF NOT EXISTS starting_price NUMERIC(12, 2) NOT NULL DEFAULT 0;
