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
  role: string;
  wage_type: 'percent' | 'hourly';
  percent_rate: number | null;
  hourly_rate: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Service {
  id: number;
  shop_id: number | null;
  name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
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
  total_amount: number | null;
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

export interface DesignerSales {
  id: number;
  designer_id: number;
  period_month: string; // Format: 'YYYY-MM'
  total_sales: number;
  bookings_count: number;
  created_at: string;
  updated_at: string;
}

