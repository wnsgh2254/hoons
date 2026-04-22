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
  // Comment: Optional customer ID to link booking to a customer
  customerId?: number | null;
  // Comment: Optional custom service name/duration when not using a predefined service_id
  customServiceName?: string | null;
  customServiceDuration?: number | null;
  memo?: string | null;
  colorLabel?: string | null;
  status?: string | null;
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

// Comment: Normalize AU phone numbers for lookup/insert (local + e164 + digitsOnly)
export function buildPhoneVariants(phoneRaw: string | undefined | null) {
  if (!phoneRaw) return { local: null as string | null, e164: null as string | null, digitsOnly: null as string | null };
  const digitsOnly = phoneRaw.replace(/[^0-9]/g, '');
  const withPlus = phoneRaw.replace(/[^0-9+]/g, '');
  if (withPlus.startsWith('+61')) {
    const withoutCountry = withPlus.slice(3);
    const local =
      withoutCountry.length === 9 && !withoutCountry.startsWith('0')
        ? `0${withoutCountry}`
        : withPlus;
    return { local, e164: withPlus, digitsOnly };
  }
  if (!withPlus.startsWith('+') && digitsOnly.startsWith('61')) {
    const e164 = `+${digitsOnly}`;
    const withoutCountry = digitsOnly.slice(2);
    const local =
      withoutCountry.length === 9 && !withoutCountry.startsWith('0')
        ? `0${withoutCountry}`
        : e164;
    return { local, e164, digitsOnly };
  }
  if (digitsOnly.startsWith('0') && digitsOnly.length >= 9) {
    const local = digitsOnly;
    const e164 = `+61${digitsOnly.slice(1)}`;
    return { local, e164, digitsOnly };
  }
  return { local: digitsOnly, e164: null as string | null, digitsOnly };
}

// Comment: Validate AU mobile format used by booking flow (must be 10 digits starting with 04).
export function isValidAuMobilePhone(phoneRaw: string | undefined | null): boolean {
  const digits = String(phoneRaw || '').replace(/[^0-9]/g, '');
  return /^04\d{8}$/.test(digits);
}

// Comment: Look up existing customer by phone (local or e164). Returns id or null.
export async function getCustomerIdByPhone(phone: string): Promise<number | null> {
  const { local, e164 } = buildPhoneVariants(phone);
  const orParts: string[] = [];
  if (local) orParts.push(`phone.eq.${local}`);
  if (e164) orParts.push(`phone.eq.${e164}`);
  if (orParts.length === 0) return null;
  const { data } = await supabase
    .from('customers')
    .select('id')
    .or(orParts.join(','))
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// Comment: Get existing customer by phone or create one with name+phone. Returns customer id.
export async function getOrCreateCustomerByNameAndPhone(name: string, phone: string): Promise<number> {
  const existingId = await getCustomerIdByPhone(phone);
  if (existingId != null) return existingId;
  const { local } = buildPhoneVariants(phone);
  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: String(name).trim(),
      phone: local ?? phone.replace(/[^0-9+]/g, ''),
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error('Failed to create customer');
  return data.id;
}

// Comment: Create a simple booking record in Supabase based on public booking payload
export async function createPublicBooking(payload: PublicBookingPayload) {
  const {
    shopId,
    designerId,
    serviceId,
    day,
    timeLabel,
    totalAmount,
    depositAmount,
    fullDate,
    customerId,
    customServiceName,
    customServiceDuration,
    memo,
    colorLabel,
    status,
  } =
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
      customer_id: customerId ?? null,
      service_id: serviceId,
      booking_date: bookingDate,
      booking_time: bookingTime,
      status: status || 'pending', // Comment: Admin bookings use 'BOOKED'; public bookings default to 'pending'
      deposit_amount: depositAmount ?? 0,
      total_amount: totalAmount,
      custom_service_name: customServiceName ?? null,
      custom_service_duration: customServiceDuration ?? null,
      memo: memo ?? null,
      color_label: colorLabel ?? null,
    })
    .select()
    .single();

  if (error) {
    // Comment: Surface a clear error for the API route to handle
    throw new Error(error.message);
  }

  return data;
}

// Comment: Update booking to confirmed and set deposit_paid after Stripe payment succeeds (called from webhook). Optionally set customer_id when created on deposit paid.
export async function updateBookingAfterDepositPaid(
  bookingId: number,
  depositPaidAmount: number,
  customerId?: number | null,
  stripePaymentIntentId?: string | null,
) {
  const updatePayload: {
    status: string;
    deposit_paid: number;
    customer_id?: number | null;
    stripe_payment_intent_id?: string | null;
  } = {
    status: 'confirmed',
    deposit_paid: depositPaidAmount,
  };
  if (customerId !== undefined) {
    updatePayload.customer_id = customerId;
  }
  if (stripePaymentIntentId) {
    updatePayload.stripe_payment_intent_id = stripePaymentIntentId;
  }
  const { data, error } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) {
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

// Comment: Update a designer/staff member (partial PATCH supported: merge with existing row)
export async function updateDesigner(
  id: number,
  updates: {
    name?: string;
    english_name?: string | null;
    role?: string;
    shop_id?: number | null;
    wage_type?: string;
    percent_rate?: number | null;
    hourly_rate?: number | null;
    product_sale_pct?: number | null;
    product_deduction_pct?: number | null;
    instagramLink?: string | null;
    is_active?: boolean;
    weekly_deduction?: number | null;
  }
) {
  if (!id || Number.isNaN(id)) {
    throw new Error('유효하지 않은 ID입니다.');
  }

  const existing = await getDesignerById(id);
  const wageType = updates.wage_type !== undefined ? updates.wage_type : existing.wage_type;

  const updateData: any = {
    name: updates.name !== undefined ? updates.name.trim() : existing.name,
    english_name:
      updates.english_name !== undefined
        ? updates.english_name?.trim() || null
        : existing.english_name,
    role: updates.role !== undefined ? updates.role.trim() : existing.role,
    shop_id: updates.shop_id !== undefined ? updates.shop_id : existing.shop_id,
    wage_type: wageType,
    percent_rate:
      wageType === 'percent'
        ? updates.percent_rate !== undefined
          ? updates.percent_rate
          : existing.percent_rate
        : null,
    hourly_rate:
      wageType === 'hourly'
        ? updates.hourly_rate !== undefined
          ? updates.hourly_rate
          : existing.hourly_rate
        : null,
    product_sale_pct:
      updates.product_sale_pct !== undefined
        ? Number(updates.product_sale_pct) || 10
        : existing.product_sale_pct != null
          ? Number(existing.product_sale_pct)
          : 10,
    product_deduction_pct:
      updates.product_deduction_pct !== undefined
        ? Number(updates.product_deduction_pct) || 10
        : existing.product_deduction_pct != null
          ? Number(existing.product_deduction_pct)
          : 10,
    instagramLink:
      updates.instagramLink !== undefined ? updates.instagramLink || null : existing.instagramLink,
    is_active: updates.is_active !== undefined ? updates.is_active : existing.is_active,
  };

  // Include weekly_deduction if provided
  if (updates.weekly_deduction !== undefined) {
    updateData.weekly_deduction = Number(updates.weekly_deduction) || 0;
  }

  let { data, error } = await supabase
    .from('designers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  // If weekly_deduction column doesn't exist yet, retry without it
  if (error && updateData.weekly_deduction !== undefined) {
    const { weekly_deduction, ...dataWithoutWeekly } = updateData;
    const retry = await supabase
      .from('designers')
      .update(dataWithoutWeekly)
      .eq('id', id)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

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

// Comment: Get a prepaid pass member by customer_id
export async function getPrepaidPassByCustomerId(customerId: number) {
  if (!customerId || Number.isNaN(customerId)) {
    throw new Error('유효하지 않은 고객 ID입니다.');
  }

  const { data, error } = await supabase
    .from('prepaid_passes')
    .select('*')
    .eq('customer_id', customerId)
    .eq('is_active', true)
    .single();

  if (error) {
    // If no record found, return null instead of throwing
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
}

function isPrepaidPassUsable(row: { expires_at?: string | null }): boolean {
  if (!row.expires_at) return true;
  const exp = new Date(row.expires_at);
  return !Number.isNaN(exp.getTime()) && exp >= new Date();
}

/** If any expiry is open-ended (null/empty), merged pass has no expiry; else use latest date */
function mergePrepaidExpiryDates(
  ...dates: (string | null | undefined)[]
): string | null {
  if (dates.some((d) => d == null || String(d).trim() === '')) return null;
  const ms = dates
    .filter((d): d is string => d != null && String(d).trim() !== '')
    .map((d) => new Date(d).getTime())
    .filter((t) => !Number.isNaN(t));
  if (ms.length === 0) return null;
  return new Date(Math.max(...ms)).toISOString().split('T')[0];
}

// Comment: Add prepaid credit for a customer — merges into existing active row(s), never duplicates per customer
export async function createPrepaidPass(payload: {
  customerId: number;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  points: number;
  expiresAt?: string | null;
}): Promise<{ member: any; merged: boolean }> {
  const { customerId, name, phone, email, points, expiresAt } = payload;

  if (!customerId || Number.isNaN(Number(customerId))) {
    throw new Error('고객을 선택해야 합니다.');
  }

  if (points < 0) {
    throw new Error('정액제 포인트는 0 이상이어야 합니다.');
  }

  const addAmount = Number(points) || 0;

  const { data: customer, error: cErr } = await supabase
    .from('customers')
    .select('id, name, phone')
    .eq('id', customerId)
    .maybeSingle();

  if (cErr || !customer) {
    throw new Error('존재하지 않는 고객입니다.');
  }

  const normalizedPhone =
    (phone?.trim() ? phone.trim().replace(/\D/g, '') : null) ||
    String(customer.phone || '').replace(/\D/g, '') ||
    null;
  const displayName = (name?.trim() || customer.name || '').trim();
  if (!displayName) {
    throw new Error('이름은 필수입니다.');
  }

  const { data: rowsByCustomer } = await supabase
    .from('prepaid_passes')
    .select('*')
    .eq('customer_id', customerId)
    .eq('is_active', true);

  const byId = new Map<number, any>();
  for (const r of rowsByCustomer || []) {
    if (r?.id != null) byId.set(Number(r.id), r);
  }
  const unique = [...byId.values()];
  const usable = unique.filter(isPrepaidPassUsable);

  if (usable.length > 0) {
    const keeper = [...usable].sort((a, b) => Number(a.id) - Number(b.id))[0];
    const others = usable.filter((r) => Number(r.id) !== Number(keeper.id));
    const totalPoints =
      usable.reduce((sum, r) => sum + Number(r.points || 0), 0) + addAmount;
    const mergedExpiry = mergePrepaidExpiryDates(
      ...usable.map((r) => r.expires_at),
      expiresAt,
    );

    const { data: updated, error: upErr } = await supabase
      .from('prepaid_passes')
      .update({
        points: totalPoints,
        name: displayName,
        phone: normalizedPhone,
        email: email?.trim() || null,
        expires_at: mergedExpiry,
        customer_id: customerId,
      })
      .eq('id', keeper.id)
      .select()
      .single();

    if (upErr) {
      throw new Error(upErr.message);
    }

    if (others.length > 0) {
      const { error: deactErr } = await supabase
        .from('prepaid_passes')
        .update({ is_active: false })
        .in(
          'id',
          others.map((r) => Number(r.id)),
        );
      if (deactErr) {
        console.error('Failed to deactivate merged prepaid rows:', deactErr);
      }
    }

    return { member: updated, merged: true };
  }

  const { data, error } = await supabase
    .from('prepaid_passes')
    .insert({
      name: displayName,
      phone: normalizedPhone,
      customer_id: customerId,
      email: email?.trim() || null,
      points: addAmount,
      is_active: true,
      expires_at: expiresAt || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { member: data, merged: false };
}

/**
 * Comment: Issue a new prepaid_passes row for a customer after a prepaid product sale (sales flow).
 * Uses explicit customer_id so balance stays in sync even if phone lookup would fail.
 */
export async function issuePrepaidPassFromSale(params: {
  customerId: number;
  passLabel: string;
  creditPoints: number;
  expiresAt?: string | null;
}) {
  const credit = Math.round(Number(params.creditPoints) || 0);
  if (credit <= 0) {
    throw new Error('정액권 적립 포인트는 1 이상이어야 합니다.');
  }
  const { data: cust, error: custErr } = await supabase
    .from('customers')
    .select('phone')
    .eq('id', params.customerId)
    .maybeSingle();
  if (custErr) {
    throw new Error(custErr.message);
  }
  const normalizedPhone = String(cust?.phone || '').replace(/\D/g, '') || null;

  const { data, error } = await supabase
    .from('prepaid_passes')
    .insert({
      name: String(params.passLabel || '정액권').trim(),
      phone: normalizedPhone,
      customer_id: params.customerId,
      email: null,
      points: credit,
      is_active: true,
      expires_at: params.expiresAt || null,
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
    customerId?: number;
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

  if (updates.customerId !== undefined) {
    const cid = Number(updates.customerId);
    if (!Number.isFinite(cid)) {
      throw new Error('유효하지 않은 고객 ID입니다.');
    }
    const { data: customer, error: cErr } = await supabase
      .from('customers')
      .select('id')
      .eq('id', cid)
      .maybeSingle();
    if (cErr || !customer) {
      throw new Error('존재하지 않는 고객입니다.');
    }
    updateData.customer_id = cid;
  }

  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.phone !== undefined) {
    const normalizedPhone = updates.phone?.trim() ? updates.phone.trim().replace(/\D/g, '') : null;
    updateData.phone = normalizedPhone;
  }
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
