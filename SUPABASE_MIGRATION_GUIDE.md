# Supabase 마이그레이션 가이드

> Supabase 대시보드 > SQL Editor에서 아래 SQL을 **순서대로** 실행해주세요.

---

## 1단계: 기존 테이블 컬럼 추가

### 1-1. designers 테이블 — 주급 공제 컬럼

```sql
ALTER TABLE designers ADD COLUMN IF NOT EXISTS weekly_deduction NUMERIC(10,2) DEFAULT 0;
```

### 1-2. bookings 테이블 — 예약 색상 라벨

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS color_label TEXT;
```

### 1-3. bookings 테이블 — Stripe 보증금 결제 금액

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_paid NUMERIC DEFAULT NULL;

COMMENT ON COLUMN bookings.deposit_paid IS 'Stripe 결제 완료 시 실제 지불된 보증금(AUD). 잔액 = total_amount - deposit_paid';
```

### 1-4. sales 테이블 — shop_id 컬럼

```sql
ALTER TABLE sales ADD COLUMN IF NOT EXISTS shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL;
```

### 1-5. refunds 테이블 — shop_id 컬럼

```sql
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL;
```

---

## 2단계: 예약 설정 테이블 생성

### 2-1. business_hours — 매장별 영업시간

```sql
CREATE TABLE IF NOT EXISTS business_hours (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  days TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_hours_shop_id ON business_hours(shop_id);
```

### 2-2. booking_items — 예약 항목

```sql
CREATE TABLE IF NOT EXISTS booking_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_items_active ON booking_items(is_active);
```

---

## 3단계: 판매 테이블 생성

### 3-1. sales — 판매 내역

```sql
CREATE TABLE IF NOT EXISTS public.sales (
  id BIGSERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL,
  customer_id BIGINT REFERENCES public.customers(id),
  sales_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sales_time TEXT,
  sales_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  cash_amount NUMERIC DEFAULT 0,
  card_amount NUMERIC DEFAULT 0,
  bank_transfer_amount NUMERIC DEFAULT 0,
  point_accumulation NUMERIC DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3-2. sales_items — 판매 항목

```sql
CREATE TABLE IF NOT EXISTS public.sales_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT REFERENCES public.sales(id) ON DELETE CASCADE,
  item_type TEXT,
  item_name TEXT,
  unit_price NUMERIC DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  discount NUMERIC DEFAULT 0,
  discount_type TEXT,
  discount_value TEXT,
  amount NUMERIC DEFAULT 0,
  manager TEXT,
  sales_classification TEXT,
  point_deduction NUMERIC DEFAULT 0,
  prepaid_deduction NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3-3. sales 관련 RLS 정책

```sql
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sales_items" ON public.sales_items FOR ALL USING (true) WITH CHECK (true);
```

---

## 4단계: 임시저장 / 환불 테이블 생성

### 4-1. temp_sales — 판매 임시저장

```sql
CREATE TABLE IF NOT EXISTS temp_sales (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4-2. refunds — 환불 내역

```sql
CREATE TABLE IF NOT EXISTS refunds (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL,
  customer_id INTEGER NOT NULL,
  total_amount INTEGER NOT NULL DEFAULT 0,
  point_deduction INTEGER NOT NULL DEFAULT 0,
  cash_amount INTEGER NOT NULL DEFAULT 0,
  card_amount INTEGER NOT NULL DEFAULT 0,
  bank_transfer_amount INTEGER NOT NULL DEFAULT 0,
  memo TEXT,
  refund_date DATE NOT NULL,
  refund_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4-3. refund_items — 환불 항목

```sql
CREATE TABLE IF NOT EXISTS refund_items (
  id SERIAL PRIMARY KEY,
  refund_id INTEGER NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  unit_price INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount INTEGER NOT NULL DEFAULT 0,
  manager TEXT
);
```

---

## 5단계: 예약/스케줄 관리 테이블 생성

### 5-1. designer_schedules — 디자이너 근무 스케줄

```sql
CREATE TABLE IF NOT EXISTS designer_schedules (
  id SERIAL PRIMARY KEY,
  designer_id INTEGER NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_designer_schedules_designer ON designer_schedules(designer_id);
CREATE INDEX IF NOT EXISTS idx_designer_schedules_weekday ON designer_schedules(weekday);
```

### 5-2. designer_time_off — 디자이너 휴무/특별근무

```sql
CREATE TABLE IF NOT EXISTS designer_time_off (
  id SERIAL PRIMARY KEY,
  designer_id INTEGER NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN designer_time_off.reason IS '휴무 사유. "특별 근무일" 값은 정기 휴무일에 특별 출근을 의미';

CREATE INDEX IF NOT EXISTS idx_designer_time_off_designer ON designer_time_off(designer_id);
CREATE INDEX IF NOT EXISTS idx_designer_time_off_dates ON designer_time_off(start_date, end_date);
```

### 5-3. booking_restrictions — 예약 제한 설정

```sql
CREATE TABLE IF NOT EXISTS booking_restrictions (
  id SERIAL PRIMARY KEY,
  designer_id INTEGER NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL,
  restriction_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN booking_restrictions.restriction_type IS 'day: 하루 전체 제한, time: 특정 시간대 제한';

CREATE INDEX IF NOT EXISTS idx_booking_restrictions_designer ON booking_restrictions(designer_id);
```

---

## 6단계: 직원 관리 테이블 생성

### 6-1. staff_attendance — 출퇴근 기록

```sql
CREATE TABLE IF NOT EXISTS staff_attendance (
  id SERIAL PRIMARY KEY,
  designer_id INTEGER NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  clock_in TIME,
  clock_out TIME,
  manual_total_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_attendance_unique ON staff_attendance(designer_id, work_date);
```

### 6-2. wage_settlements — 주급 정산 내역

```sql
CREATE TABLE IF NOT EXISTS wage_settlements (
  id SERIAL PRIMARY KEY,
  designer_id INTEGER NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  week_num INTEGER NOT NULL,
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wage_settlements_designer ON wage_settlements(designer_id);
CREATE INDEX IF NOT EXISTS idx_wage_settlements_period ON wage_settlements(year, month, week_num);
```

---

## 7단계: 고객/관리 테이블 생성

### 7-1. prepaid_passes — 선불 이용권 (회원권)

```sql
CREATE TABLE IF NOT EXISTS prepaid_passes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  points NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prepaid_passes_active ON prepaid_passes(is_active);
```

### 7-2. admin_memo — 관리자 메모 (단일 행)

```sql
CREATE TABLE IF NOT EXISTS admin_memo (
  id INTEGER PRIMARY KEY DEFAULT 1,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 행 삽입
INSERT INTO admin_memo (id, content) VALUES (1, '')
ON CONFLICT (id) DO NOTHING;
```

### 7-3. product_sale_items — POS 제품 판매 항목

```sql
CREATE TABLE IF NOT EXISTS product_sale_items (
  id SERIAL PRIMARY KEY,
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_sale_items_item ON product_sale_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_product_sale_items_created ON product_sale_items(created_at);
```

---

## 8단계: 재고 관리 테이블 생성

### 8-1. inventory_items — 재고 상품

```sql
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  size TEXT,
  sku TEXT,
  category TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  stock INTEGER DEFAULT 0,
  status TEXT DEFAULT 'In Stock',
  icon TEXT,
  brand TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN inventory_items.status IS 'In Stock / Low Stock / Out of Stock — stock 수량에 따라 자동 결정';

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
```

### 8-2. inventory_brands — 브랜드 목록

```sql
CREATE TABLE IF NOT EXISTS inventory_brands (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8-3. inventory_suppliers — 매입처 (공급업체)

```sql
CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  mobile_phone TEXT,
  phone TEXT,
  fax TEXT,
  email TEXT,
  memo TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8-4. inventory_purchases — 매입/반품 헤더

```sql
CREATE TABLE IF NOT EXISTS inventory_purchases (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'purchase',
  supplier_id INTEGER REFERENCES inventory_suppliers(id) ON DELETE SET NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN inventory_purchases.type IS 'purchase: 매입, return: 반품';

CREATE INDEX IF NOT EXISTS idx_inventory_purchases_date ON inventory_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_inventory_purchases_supplier ON inventory_purchases(supplier_id);
```

### 8-5. inventory_purchase_items — 매입/반품 항목

```sql
CREATE TABLE IF NOT EXISTS inventory_purchase_items (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER NOT NULL REFERENCES inventory_purchases(id) ON DELETE CASCADE,
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
  unit_price NUMERIC DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  line_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_purchase_items_purchase ON inventory_purchase_items(purchase_id);
```

### 8-6. inventory_stock_adjustments — 재고 임의 조정 이력

```sql
CREATE TABLE IF NOT EXISTS inventory_stock_adjustments (
  id SERIAL PRIMARY KEY,
  adjusted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  product_code TEXT,
  product_name TEXT,
  before_stock INTEGER DEFAULT 0,
  after_stock INTEGER DEFAULT 0,
  diff INTEGER DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_date ON inventory_stock_adjustments(adjusted_at);
```

### 8-7. inventory_internal_usage_entries — 내부 소모 내역

```sql
CREATE TABLE IF NOT EXISTS inventory_internal_usage_entries (
  id SERIAL PRIMARY KEY,
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  staff_name TEXT,
  category TEXT,
  product_code TEXT,
  product_name TEXT,
  unit_price NUMERIC DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_usage_date ON inventory_internal_usage_entries(used_at);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_item ON inventory_internal_usage_entries(inventory_item_id);
```

### 8-8. inventory_movements — 재고 변동 이력 (통합)

```sql
CREATE TABLE IF NOT EXISTS inventory_movements (
  id SERIAL PRIMARY KEY,
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT,
  product_code TEXT,
  product_name TEXT,
  type TEXT NOT NULL,
  quantity_change INTEGER NOT NULL DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  created_via TEXT,
  memo TEXT
);

COMMENT ON COLUMN inventory_movements.type IS '매입 / 반품 / 내부 소모 / 조정 등';
COMMENT ON COLUMN inventory_movements.created_via IS 'purchase / internal_usage / adjustment 등 변동 원인';

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(type);
```

---

## 9단계: 재고 관련 RLS 정책

```sql
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_internal_usage_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on inventory_items" ON inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on inventory_brands" ON inventory_brands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on inventory_suppliers" ON inventory_suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on inventory_purchases" ON inventory_purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on inventory_purchase_items" ON inventory_purchase_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on inventory_stock_adjustments" ON inventory_stock_adjustments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on inventory_internal_usage_entries" ON inventory_internal_usage_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on inventory_movements" ON inventory_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on product_sale_items" ON product_sale_items FOR ALL USING (true) WITH CHECK (true);
```

---

## 10단계: 기타 테이블 RLS 정책

```sql
ALTER TABLE booking_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE designer_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE designer_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE wage_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE prepaid_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_memo ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on booking_restrictions" ON booking_restrictions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on designer_schedules" ON designer_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on designer_time_off" ON designer_time_off FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on staff_attendance" ON staff_attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on wage_settlements" ON wage_settlements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on prepaid_passes" ON prepaid_passes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on admin_memo" ON admin_memo FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on temp_sales" ON temp_sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on refunds" ON refunds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on refund_items" ON refund_items FOR ALL USING (true) WITH CHECK (true);
```

---

## 전체 테이블 요약

| 단계 | 테이블 | 설명 |
|------|--------|------|
| 1 | `designers` (컬럼 추가) | weekly_deduction |
| 1 | `bookings` (컬럼 추가) | color_label, deposit_paid |
| 1 | `sales` (컬럼 추가) | shop_id |
| 1 | `refunds` (컬럼 추가) | shop_id |
| 2 | `business_hours` | 매장별 영업시간 |
| 2 | `booking_items` | 예약 서비스 항목 |
| 3 | `sales` | 판매 내역 |
| 3 | `sales_items` | 판매 항목 상세 |
| 4 | `temp_sales` | 판매 임시저장 |
| 4 | `refunds` | 환불 내역 |
| 4 | `refund_items` | 환불 항목 상세 |
| 5 | `designer_schedules` | 디자이너 근무 스케줄 |
| 5 | `designer_time_off` | 디자이너 휴무/특별근무 |
| 5 | `booking_restrictions` | 예약 제한 설정 |
| 6 | `staff_attendance` | 출퇴근 기록 |
| 6 | `wage_settlements` | 주급 정산 내역 |
| 7 | `prepaid_passes` | 선불 이용권 |
| 7 | `admin_memo` | 관리자 메모 |
| 7 | `product_sale_items` | POS 제품 판매 |
| 8 | `inventory_items` | 재고 상품 |
| 8 | `inventory_brands` | 브랜드 목록 |
| 8 | `inventory_suppliers` | 매입처 |
| 8 | `inventory_purchases` | 매입/반품 헤더 |
| 8 | `inventory_purchase_items` | 매입/반품 항목 |
| 8 | `inventory_stock_adjustments` | 재고 조정 이력 |
| 8 | `inventory_internal_usage_entries` | 내부 소모 내역 |
| 8 | `inventory_movements` | 재고 변동 이력 (통합) |

---

## 참고: 기존 테이블 (마이그레이션 불필요)

아래 테이블들은 프로젝트 초기부터 존재하는 것으로 가정합니다.
Supabase에 이미 있다면 별도 생성 불필요합니다.

- `shops` — 매장 정보
- `designers` — 디자이너/직원 정보
- `customers` — 고객 정보
- `services` — 서비스 메뉴
- `bookings` — 예약 내역
- `payments` — 결제 내역 (booking_id 기반)
