// Database types
export interface Shop {
  id: number;
  name: string;
  location: string | null;
  created_at: string;
}

export interface Designer {
  id: number;
  shop_id: number | null;
  name: string;
  english_name: string | null;
  role: string;
  wage_type: 'percent' | 'hourly';
  percent_rate: number | null;
  hourly_rate: number | null;
  is_active: boolean;
  created_at: string;
  instagramLink: string;
}

export interface Service {
  id: number;
  shop_id: number | null;
  name: string;
  /** Optional English label for customer-facing pages (e.g. My Booking). */
  english_name?: string | null;
  price: number;
  duration_minutes: number;
  /** Short description for customer booking UI */
  description?: string | null;
  is_active: boolean;
  category: string | null;
  visible_to: 'customer' | 'admin' | 'both';
  created_at: string;
}

export interface Customer {
  id: number;
  customer_number?: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  prepaid_balance?: number;
  total_sales?: number;
  assigned_designer_id?: number | null;
  assigned_designer?: { id: number; name: string } | null;
}

export interface Booking {
  id: number;
  shop_id: number | null;
  designer_id: number | null;
  customer_id: number | null;
  service_id: number | null;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'noshow';
  deposit_amount: number;
  /** AUD actually charged for deposit (Stripe webhook) */
  deposit_paid?: number | null;
  total_amount: number | null;
  /** Stripe PaymentIntent id for online deposit refunds */
  stripe_payment_intent_id?: string | null;
  /** Set when admin refunded the card deposit */
  deposit_refunded_at?: string | null;
  stripe_refund_id?: string | null;
  /** 0 | 1 — set when admin completes sale registration for this visit */
  sale_completed?: number;
  memo?: string | null;
  color_label?: string | null;
  created_at: string;
}

export interface Payment {
  id: number;
  booking_id: number | null;
  amount: number;
  method: 'cash' | 'card' | 'stripe' | 'bank_transfer';
  type: 'deposit' | 'balance' | 'product';
  created_at: string;
}

export interface InventoryItem {
  id: number;
  shop_id?: number | null;
  name: string;
  brand?: string | null;
  size: string | null;
  sku: string | null;
  category: string;
  price: number;
  stock: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  icon: string | null;
  created_at: string;
}

export interface DesignerSales {
  id: number;
  designer_id: number;
  period_month: string; // Format: 'YYYY-MM'
  total_sales: number;
  bookings_count: number;
  created_at: string;
  updated_at: string;
}

// Booking with joined relation fields (returned by API with select joins)
export type BookingWithRelations = Booking & {
  designer?: { id: number; name: string | null } | null;
  service?: { id: number; name: string | null; duration_minutes?: number | null } | null;
  customer?: { id: number; name: string | null; phone?: string | null } | null;
  shop?: { id: number; name: string | null } | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  created_at?: string | null;
};

// Business hours (from reservation settings)
export interface BusinessHourEntry {
  id: number;
  shop_id: number | null;
  start_time: string;
  end_time: string;
  days: string[];
  created_at: string;
}

// Booking items (from reservation settings)
export interface BookingItemEntry {
  id: number;
  name: string;
  duration_hours: number;
  duration_minutes: number;
  /** AUD; used for public booking deposit when item is chosen */
  starting_price?: number;
  /** Shown on public booking flow (admin reservation > 예약 항목) */
  memo?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// Holiday calendar types
export type HolidayType = 'regular' | 'arbitrary' | 'special';

export interface DayEntry {
  name: string;
  type: HolidayType;
}

// Sales types
export type SalesItemType = 'service' | 'product' | 'prepaid';

export interface SalesDetailItem {
  item_type: SalesItemType;
  item_name: string;
  unit_price: number;
  quantity: number;
  discount: number;
  discount_type?: string | null;
  discount_value?: number | string | null;
  amount: number;
  manager: string | null;
  sales_classification: string | null;
  prepaid_deduction: number;
}

export interface SalesDetailData {
  id: number;
  customer_id: number;
  shop_id?: number | null;
  booking_id?: number | null;
  customer_name: string;
  sales_date: string;
  sales_time: string;
  sales_amount: number;
  discount_amount: number;
  total_amount: number;
  cash_amount: number;
  card_amount: number;
  bank_transfer_amount: number;
  payment_method?: string | null;
  point_accumulation: number;
  memo: string | null;
  items: SalesDetailItem[];
  created_by?: string;
  created_at?: string;
  edit_history?: string[];
}

// New booking modal time slot (shared by appointments + customers pages)
export interface NewBookingTimeSlotSelectedItem {
  id: number;
  type: string;
  name: string;
  durationMinutes?: number;
}

export interface NewBookingTimeSlot {
  designerId: number | null;
  time: string;
  duration: number;
  serviceTab: 'service';
  serviceId: number | null;
  selectedItems: NewBookingTimeSlotSelectedItem[];
}

export const DEFAULT_NEW_BOOKING_TIME_SLOT: NewBookingTimeSlot = {
  designerId: null,
  time: '10:00 AM',
  duration: 30,
  serviceTab: 'service',
  serviceId: null,
  selectedItems: [],
};

// Refund types (환불)
export interface RefundItem {
  id: string;
  type: SalesItemType;
  name: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  manager: string;
}
