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
  // Comment: Optional full date override (YYYY-MM-DD). When provided, 'day' is ignored.
  fullDate?: string;
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
  const { shopId, designerId, serviceId, day, timeLabel, totalAmount, depositAmount, fullDate } =
    payload;

  const bookingDate = fullDate || buildBookingDateFromDay(day);
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

// Comment: Get a single designer/staff member by ID
export async function getDesignerById(id: number) {
  if (!id || Number.isNaN(id)) {
    throw new Error('유효하지 않은 ID입니다.');
  }

  const { data, error } = await supabase
    .from('designers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('직원을 찾을 수 없습니다.');
  }

  return data;
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

// Comment: Update a designer/staff member
export async function updateDesigner(
  id: number,
  updates: {
    name: string;
    role: string;
    shop_id?: number | null;
    wage_type: string;
    percent_rate?: number | null;
    hourly_rate?: number | null;
    is_active?: boolean;
  }
) {
  if (!id || Number.isNaN(id)) {
    throw new Error('유효하지 않은 ID입니다.');
  }

  const updateData: any = {
    name: updates.name.trim(),
    role: updates.role.trim(),
    shop_id: updates.shop_id || null,
    wage_type: updates.wage_type,
    percent_rate: updates.wage_type === 'percent' ? updates.percent_rate : null,
    hourly_rate: updates.wage_type === 'hourly' ? updates.hourly_rate : null,
    is_active: updates.is_active !== undefined ? updates.is_active : true,
  };

  const { data, error } = await supabase
    .from('designers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Comment: Delete a designer/staff member
export async function deleteDesigner(id: number) {
  if (!id || Number.isNaN(id)) {
    throw new Error('유효하지 않은 ID입니다.');
  }

  const { error } = await supabase.from('designers').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
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

// Comment: Prepaid Pass Management Functions

// Comment: Get all prepaid pass members, optionally filtered by search query with pagination
export async function getPrepaidPasses(search?: string, page: number = 1, limit: number = 20) {
  let query = supabase
    .from('prepaid_passes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Comment: Filter by search query if provided
  if (search && search.trim()) {
    const searchTerm = search.trim();
    query = query.or(
      `name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
    );
  }

  // Comment: Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    members: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

// Comment: Get a single prepaid pass member by ID
export async function getPrepaidPassById(id: number) {
  if (!id || Number.isNaN(id)) {
    throw new Error('유효하지 않은 ID입니다.');
  }

  const { data, error } = await supabase
    .from('prepaid_passes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('회원을 찾을 수 없습니다.');
  }

  return data;
}

// Comment: Create a new prepaid pass member
export async function createPrepaidPass(payload: {
  name: string;
  phone?: string | null;
  email?: string | null;
  points: number;
  expiresAt?: string | null;
}) {
  const { name, phone, email, points, expiresAt } = payload;

  if (!name || !name.trim()) {
    throw new Error('이름은 필수입니다.');
  }

  if (points < 0) {
    throw new Error('정액제 포인트는 0 이상이어야 합니다.');
  }

  const { data, error } = await supabase
    .from('prepaid_passes')
    .insert({
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      points: Number(points) || 0,
      is_active: true,
      expires_at: expiresAt || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Comment: Update a prepaid pass member
export async function updatePrepaidPass(
  id: number,
  updates: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    points?: number;
    expiresAt?: string | null;
    isActive?: boolean;
  }
) {
  if (!id || Number.isNaN(id)) {
    throw new Error('유효하지 않은 ID입니다.');
  }

  const updateData: any = {};

  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.phone !== undefined) updateData.phone = updates.phone?.trim() || null;
  if (updates.email !== undefined) updateData.email = updates.email?.trim() || null;
  if (updates.points !== undefined) updateData.points = Number(updates.points) || 0;
  if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt || null;
  if (updates.isActive !== undefined) updateData.is_active = Boolean(updates.isActive);

  const { data, error } = await supabase
    .from('prepaid_passes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Comment: Delete a prepaid pass member
export async function deletePrepaidPass(id: number) {
  if (!id || Number.isNaN(id)) {
    throw new Error('유효하지 않은 ID입니다.');
  }

  const { error } = await supabase.from('prepaid_passes').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
