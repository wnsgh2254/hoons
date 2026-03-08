-- Business Hours table: stores operating hours per shop
CREATE TABLE IF NOT EXISTS business_hours (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  days TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Booking Items table: admin-defined reservation items with durations (shared across all shops)
CREATE TABLE IF NOT EXISTS booking_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for shop-based queries
CREATE INDEX IF NOT EXISTS idx_business_hours_shop_id ON business_hours(shop_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_active ON booking_items(is_active);
