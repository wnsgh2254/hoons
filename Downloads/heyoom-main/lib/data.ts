import { supabase } from '@/lib/supabase';

// Comment: Payload received from public booking flow on the frontend
export interface PublicBookingPayload {
  shopId: number | null;
  designerId: number | null;
  serviceId: number | null;
  day: number;
  timeLabel: string;
  totalAmount: number | null;
  depositAmount: number | null;
}

// Comment: Convert display time like "2:00 PM" to 24h "14:00:00" string for DB
function toTimeString(timeLabel: string): string | null {
  const match = timeLabel.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return null;
  let [, hh, mm, ap] = match;
  let hour = parseInt(hh, 10);
  const isPM = ap.toUpperCase() === 'PM';
  if (isPM && hour < 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  const hStr = hour.toString().padStart(2, '0');
  return `${hStr}:${mm}:00`;
}

// Comment: Temporary helper to map a day number to a full booking date string
// In the future this should be replaced with a real month/year coming from the client.
function buildBookingDateFromDay(day: number): string {
  const dayStr = day.toString().padStart(2, '0');
  return `2023-10-${dayStr}`;
}

// Comment: Create a simple booking record in Supabase based on public booking payload
export async function createPublicBooking(payload: PublicBookingPayload) {
  const { shopId, designerId, serviceId, day, timeLabel, totalAmount, depositAmount } = payload;

  const bookingDate = buildBookingDateFromDay(day);
  const bookingTime = toTimeString(timeLabel);

  if (!bookingTime) {
    throw new Error(`Invalid time format: ${timeLabel}`);
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      shop_id: shopId,
      designer_id: designerId,
      customer_id: null,
      service_id: serviceId,
      booking_date: bookingDate,
      booking_time: bookingTime,
      status: 'confirmed', // Comment: Booking is created only after deposit is paid
      deposit_amount: depositAmount ?? 0,
      total_amount: totalAmount,
    })
    .select()
    .single();

  if (error) {
    // Comment: Surface a clear error for the API route to handle
    throw new Error(error.message);
  }

  return data;
}

// Comment: Load all shops from Supabase for the booking flow
export async function getShops() {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .order('id');

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Comment: Load all active designers belonging to a given shop (via designer_shops link table)
export async function getDesignersByShop(shopId: number) {
  const { data, error } = await supabase
    .from('designer_shops')
    .select('designer:designer_id(*)')
    .eq('shop_id', shopId)
    .eq('is_active', true);

  if (error) {
    throw new Error(error.message);
  }

  // Flatten designer field from the join result
  const designers = (data || []).map((row: any) => row.designer);
  return designers;
}

// Comment: Load all active services, optionally filtered by shop_id
export async function getServicesByShop(shopId?: number) {
  let query = supabase.from('services').select('*').eq('is_active', true);

  if (typeof shopId === 'number') {
    query = query.eq('shop_id', shopId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Comment: Load all staff members (designers), optionally filtered by shop_id and role
export async function getAllStaff(shopId?: number, role?: string) {
  let query = supabase.from('designers').select('*').eq('is_active', true);

  if (typeof shopId === 'number') {
    query = query.eq('shop_id', shopId);
  }

  if (role && role !== 'All Staff') {
    query = query.eq('role', role);
  }

  const { data, error } = await query.order('name');

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

// Comment: Get staff statistics (from designers table)
export async function getStaffStats(shopId?: number) {
  let query = supabase.from('designers').select('*', { count: 'exact' }).eq('is_active', true);

  if (typeof shopId === 'number') {
    query = query.eq('shop_id', shopId);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const totalStaff = count || 0;
  const activeStaff = data?.filter((s: any) => s.is_active)?.length || 0;

  return {
    totalStaff,
    activeStaff,
  };
}

// Comment: Load work logs for staff (using designer_id instead of staff_id)
export async function getWorkLogs(designerId?: number, period?: { start: string; end: string }) {
  // Try designer_id first, fallback to staff_id if needed
  let query = supabase.from('work_logs').select('*, designer:designer_id(*)').order('date', { ascending: false });

  if (typeof designerId === 'number') {
    query = query.eq('designer_id', designerId);
  }

  if (period) {
    query = query.gte('date', period.start).lte('date', period.end);
  }

  const { data, error } = await query.limit(50);

  // If designer_id doesn't work, try staff_id
  if (error && error.message.includes('designer_id')) {
    let fallbackQuery = supabase.from('work_logs').select('*, staff:staff_id(*)').order('date', { ascending: false });

    if (typeof designerId === 'number') {
      fallbackQuery = fallbackQuery.eq('staff_id', designerId);
    }

    if (period) {
      fallbackQuery = fallbackQuery.gte('date', period.start).lte('date', period.end);
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery.limit(50);

    if (fallbackError) {
      throw new Error(fallbackError.message);
    }

    return fallbackData || [];
  }

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

// Comment: Get sales data from designer_sales table for a specific period
export async function getDesignerSalesForPeriod(designerIds: number[], periodMonth: string) {
  if (designerIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('designer_sales')
    .select('*')
    .in('designer_id', designerIds)
    .eq('period_month', periodMonth);

  if (error) {
    // If table doesn't exist, return empty array
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      return [];
    }
    throw new Error(error.message);
  }

  return data || [];
}

