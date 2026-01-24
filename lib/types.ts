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
  price: number;
  duration_minutes: number;
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

export interface InventoryItem {
  id: number;
  name: string;
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
