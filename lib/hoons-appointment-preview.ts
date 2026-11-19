'use client';

import { demoReservationService, readHoonsDemo, type DemoReservation } from './hoons-booking-demo';
import { HOONS_ADMIN_SHOPS, hoonsAdminStaff, type HoonsAdminStaff } from './hoons-staff-preview';
import { demoCatalogServices } from './hoons-demo-services';
import { fetchHoonsServicePreview, hoonsAdminServices } from './hoons-service-preview';
import type { BookingWithRelations } from './types';
import { getSydneyToday, getWeekEnd, getWeekStart } from './utils/appointment-utils';

export const HOONS_APPOINTMENT_SHOPS = HOONS_ADMIN_SHOPS;

const EXAMPLES = [
  { reference: 'SAMPLE-01', locationId: 'collective', staffId: 'junho', serviceId: 'cut', start: 600, customer: 'Alex Park' },
  { reference: 'SAMPLE-02', locationId: 'collective', staffId: 'mia', serviceId: 'colour', start: 750, customer: 'Taylor Lee' },
  { reference: 'SAMPLE-03', locationId: 'the-hoons', staffId: 'lauren', serviceId: 'cut-style', start: 630, customer: 'Jamie Kim' },
  { reference: 'SAMPLE-04', locationId: 'gallery', staffId: 'director', serviceId: 'perm', start: 720, customer: 'Sam Choi' },
  { reference: 'SAMPLE-05', locationId: 'ardor', staffId: 'noah', serviceId: 'colour', start: 660, customer: 'Robin Jung' },
  { reference: 'SAMPLE-06', locationId: 'ardor', staffId: 'sophie', serviceId: 'cut', start: 855, customer: 'Casey Han' },
] as const satisfies ReadonlyArray<Omit<DemoReservation, 'day'> & { customer: string }>;

function appointmentData() {
  const demo = readHoonsDemo();
  const staff = hoonsAdminStaff(demo);
  const designers = staff.filter(({ is_active }) => is_active);
  const today = getSydneyToday();
  const appointments = [
    ...EXAMPLES.map((sample) => ({ ...sample, day: today })),
    ...demo.reservations.map((reservation) => ({ ...reservation, customer: '온라인 데모 예약' })),
  ];

  const catalog = demoCatalogServices(demo.catalog);
  const bookings = appointments.flatMap<BookingWithRelations>((item, index) => {
    const designer = staff.find(({ staffKey }) => staffKey === item.staffId);
    const service = demoReservationService(demo, item);
    const adminServiceId = catalog.find(({ id }) => id === item.serviceId)?.adminId;
    const shop = HOONS_ADMIN_SHOPS.find(({ locationKey }) => locationKey === item.locationId);
    if (!designer || !service || !adminServiceId || !shop) return [];
    const customer = { id: 50_001 + index, name: item.customer, phone: null };
    const hour = String(Math.floor(item.start / 60)).padStart(2, '0');
    const minute = String(item.start % 60).padStart(2, '0');

    return [{
      id: 40_001 + index,
      shop_id: shop.id,
      designer_id: designer.id,
      service_id: adminServiceId,
      customer_id: customer.id,
      booking_date: item.day,
      booking_time: `${hour}:${minute}:00`,
      status: 'confirmed',
      deposit_amount: service.deposit,
      deposit_paid: 0,
      total_amount: service.price,
      created_at: item.day + 'T00:00:00Z',
      customer,
      customer_name: customer.name,
      designer: { id: designer.id, name: designer.name },
      service: { id: adminServiceId, name: service.name, duration_minutes: service.minutes },
      shop: { id: shop.id, name: shop.name },
    }];
  });

  return { designers, bookings };
}

function availableStaff(designers: HoonsAdminStaff[], day: string) {
  const weekday = new Date(day + 'T00:00:00Z').getUTCDay();
  return designers.filter(({ workingDays }) => workingDays.includes(weekday));
}

function calendarCounts(bookings: BookingWithRelations[], month: string, shopId: string | null) {
  const counts: Record<number, number> = {};
  for (const booking of bookings) {
    if (!booking.booking_date.startsWith(month + '-') || (shopId && String(booking.shop_id) !== shopId)) continue;
    const day = Number(booking.booking_date.slice(-2));
    counts[day] = (counts[day] ?? 0) + 1;
  }
  return counts;
}

const MEMO_KEY = 'hoons-appointment-preview-memo';
function readMemo() {
  try { return localStorage.getItem(MEMO_KEY) ?? ''; }
  catch { return ''; }
}

/** Preview data stays in the browser. Only authentication uses the application API. */
export const fetchHoonsAppointments: typeof fetch = async (input, options) => {
  const path = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(path, window.location.origin);
  if (url.origin === window.location.origin && url.pathname === '/api/auth/session') return fetch(input, options);
  options?.signal?.throwIfAborted();
  const method = options?.method?.toUpperCase() ?? 'GET';
  const query = url.searchParams;
  const endpoint = url.pathname;

  if (endpoint === '/api/admin-memo' && method === 'PATCH') {
    try {
      const { content } = JSON.parse(String(options?.body));
      if (typeof content !== 'string') return Response.json({ error: '전달사항을 확인해 주세요.' }, { status: 400 });
      localStorage.setItem(MEMO_KEY, content);
      return Response.json({ content });
    } catch {
      return Response.json({ error: '전달사항을 저장할 수 없습니다.' }, { status: 400 });
    }
  }

  if (method !== 'GET') {
    return Response.json({ error: 'HOONS 예시 예약은 조회 전용입니다. 고객 예약 데모에서 테스트 예약을 추가할 수 있습니다.' }, { status: 409 });
  }

  const { designers, bookings } = appointmentData();
  if (endpoint === '/api/appointments/initial-data') {
    const date = query.get('date') ?? getSydneyToday();
    const month = query.get('month') ?? date.slice(0, 7);
    const shop = query.get('shop_id');
    const session = await fetch('/api/auth/session').then((response) => response.json()).catch(() => null);
    return Response.json({
      userRole: session?.user?.role ?? null,
      memo: readMemo(),
      designers,
      shops: HOONS_APPOINTMENT_SHOPS,
      bookingModalServices: hoonsAdminServices(),
      bookingRestrictions: [],
      availableDesignerIdsByShop: Object.fromEntries(HOONS_ADMIN_SHOPS.map(({ id }) => [
        id, availableStaff(designers, date).filter(({ shop_id }) => shop_id === id).map((member) => member.id),
      ])),
      dayCounts: calendarCounts(bookings, month, shop),
      bookings: bookings.filter(({ booking_date, shop_id }) =>
        (!shop || String(shop_id) === shop) && booking_date >= getWeekStart(date) && booking_date <= getWeekEnd(date),
      ),
    });
  }

  if (endpoint === '/api/appointment') {
    const start = query.get('start_date');
    const end = query.get('end_date');
    const day = query.get('date');
    const shop = query.get('shop_id') ?? query.get('shopId');
    const designer = query.get('designer_id') ?? query.get('designerId');
    const customer = query.get('customer_id');
    const filtered = bookings.filter((booking) =>
      (!start || booking.booking_date >= start) &&
      (!end || booking.booking_date <= end) &&
      (!day || booking.booking_date === day) &&
      (!shop || String(booking.shop_id) === shop) &&
      (!designer || String(booking.designer_id) === designer) &&
      (!customer || String(booking.customer_id) === customer),
    );
    return Response.json(query.get('minimal') === 'true'
      ? { dayCounts: calendarCounts(filtered, (start ?? getSydneyToday()).slice(0, 7), shop), bookings: filtered }
      : { bookings: filtered, total: filtered.length });
  }

  if (endpoint === '/api/shops') return Response.json({ shops: HOONS_APPOINTMENT_SHOPS });
  if (endpoint === '/api/designers' || endpoint === '/api/staff' || endpoint === '/api/designer-schedules' || endpoint === '/api/available-designers') {
    const venue = query.get('shopId') ?? query.get('shop_id');
    const day = query.get('date');
    const atLocation = designers.filter(({ shop_id }) => !venue || String(shop_id) === venue);
    const filtered = day ? availableStaff(atLocation, day) : atLocation;
    return Response.json({ designers: filtered, staff: filtered, designerIds: filtered.map(({ id }) => id), schedules: [] });
  }
  if (endpoint === '/api/booking-modal-services') return Response.json({ services: hoonsAdminServices() });
  if (['/api/services', '/api/services/categories', '/api/designer-services'].includes(endpoint)) {
    return fetchHoonsServicePreview(input, options);
  }
  if (endpoint === '/api/admin-memo') return Response.json({ content: readMemo() });

  if (endpoint === '/api/customers' || endpoint === '/api/customers/search') {
    const term = (query.get('search') ?? query.get('q') ?? '').toLowerCase();
    return Response.json({ customers: bookings.flatMap(({ customer }) =>
      customer?.name?.toLowerCase().includes(term) ? [customer] : [],
    ) });
  }
  if (endpoint.startsWith('/api/customers/')) {
    const [, , , id, part] = endpoint.split('/');
    const customer = bookings.find(({ customer_id }) => String(customer_id) === id)?.customer;
    return part === 'stats' ? Response.json({ stats: {} }) : Response.json({ customer: customer ?? null });
  }

  return Response.json({ restrictions: [], timeOffs: [], sales: [], refunds: [], prepaid: [], members: [], records: [], categories: [], items: [], brands: [] });
};
