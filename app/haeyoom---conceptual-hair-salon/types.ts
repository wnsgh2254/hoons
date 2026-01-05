export interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  image: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  category: 'Cut' | 'Perm' | 'Color' | 'Care';
  isActive: boolean;
}

export interface Designer {
  id: string;
  shopId: string;
  name: string;
  role: string;
  profileImage: string;
  description: string;
  specialties: string[];
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface BookingState {
  shop: Shop | null;
  service: Service | null;
  designer: Designer | null;
  date: string | null;
  time: string | null;
  customerName: string;
  customerPhone: string;
}

export enum BookingStep {
  SHOP_SELECT = 0,
  SERVICE_SELECT = 1,
  DESIGNER_SELECT = 2,
  DATE_SELECT = 3,
  PAYMENT = 4,
  COMPLETE = 5,
}
