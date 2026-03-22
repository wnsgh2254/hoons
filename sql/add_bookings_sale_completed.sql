-- 1 = 판매 등록에서 계산 완료 후 (schedule card blue). Deposit alone does not set this.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS sale_completed SMALLINT NOT NULL DEFAULT 0
  CHECK (sale_completed IN (0, 1));
