'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { HOONS_LOCATIONS, type HoonsLocationId } from './hoons-locations';

import {
  BASE_DEMO_SERVICES, demoCatalogServices, demoServicesForStaff,
  type DemoServiceCatalog, type ServiceQuote,
} from './hoons-demo-services';

const DEMO_STAFF = [
  { id: 'junho', name: 'Junho', locationId: 'collective', start: 600 },
  { id: 'mia', name: 'Mia', locationId: 'collective', start: 630 },
  { id: 'lauren', name: 'Lauren', locationId: 'the-hoons', start: 630 },
  { id: 'director', name: '대표님', locationId: 'gallery', start: 600 },
  { id: 'noah', name: 'Noah', locationId: 'ardor', start: 660 },
  { id: 'sophie', name: 'Sophie', locationId: 'ardor', start: 600 },
] as const;

type StaffId = string;

export type DemoStaffProfile = {
  name: string;
  englishName: string | null;
  role: string;
  locationId: HoonsLocationId;
  wageType: 'percent' | 'hourly';
  percentRate: number | null;
  hourlyRate: number | null;
  instagramLink: string;
};

export type DemoStaff = DemoStaffProfile & {
  id: StaffId;
  adminId: number;
  start: number;
  active: boolean;
  workingDays: number[];
};

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
export const DEMO_WORKDAY_END = 18 * 60;

export type DemoReservation = {
  reference: string;
  locationId: HoonsLocationId;
  staffId: StaffId;
  serviceId: string;
  serviceSnapshot?: ServiceQuote;
  day: string;
  start: number;
};

export type DemoState = {
  closedLocations: HoonsLocationId[];
  staffLocations: Partial<Record<StaffId, HoonsLocationId>>;
  reservations: DemoReservation[];
  staffRecords: Record<StaffId, DemoStaff>;
  catalog: DemoServiceCatalog;
};

const EMPTY_STATE: DemoState = { closedLocations: [], staffLocations: {}, reservations: [], staffRecords: {}, catalog: {} };
const STORAGE_KEY = 'hoons-booking-demo-v1';
const UPDATE_EVENT = 'hoons-booking-demo-update';
const sydneyDay = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit',
});
const calendarDay = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short',
});
const aud = new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 2,
});

function readRawState() {
  try { return window.localStorage.getItem(STORAGE_KEY); }
  catch { return null; }
}

function readState(raw: string | null): DemoState {
  if (!raw) return EMPTY_STATE;
  try {
    const stored = JSON.parse(raw) as Partial<DemoState> | null;
    if (stored && Array.isArray(stored.closedLocations) && Array.isArray(stored.reservations)
      && stored.staffLocations && typeof stored.staffLocations === 'object') {
      return {
        closedLocations: stored.closedLocations,
        staffLocations: stored.staffLocations,
        reservations: stored.reservations,
        staffRecords: stored.staffRecords && typeof stored.staffRecords === 'object'
          ? stored.staffRecords
          : {},
        catalog: stored.catalog && typeof stored.catalog === 'object' ? stored.catalog : {},
      };
    }
  } catch {
    return EMPTY_STATE;
  }
  return EMPTY_STATE;
}

function subscribe(onChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY || event.key === null) onChange();
  }
  window.addEventListener('storage', onStorage);
  window.addEventListener(UPDATE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(UPDATE_EVENT, onChange);
  };
}

export function readHoonsDemo() {
  return readState(readRawState());
}

export function useHoonsDemo() {
  const raw = useSyncExternalStore(subscribe, readRawState, () => null);
  return useMemo(() => readState(raw), [raw]);
}

async function editDemo(change: (current: DemoState) => DemoState) {
  function save() {
    const state = readState(readRawState());
    const next = change(state);
    if (state === next) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(UPDATE_EVENT));
  }
  if (navigator.locks) await navigator.locks.request(STORAGE_KEY, save);
  else save();
}

export function editDemoCatalog(change: (catalog: DemoServiceCatalog) => DemoServiceCatalog) {
  return editDemo((state) => ({ ...state, catalog: change(state.catalog) }));
}

export function demoReservationService(state: DemoState, reservation: DemoReservation) {
  return reservation.serviceSnapshot
    ?? BASE_DEMO_SERVICES.find(({ id }) => id === reservation.serviceId)
    ?? demoCatalogServices(state.catalog).find(({ id }) => id === reservation.serviceId);
}

export function allDemoStaff(state: DemoState): DemoStaff[] {
  const staff = new Map<string, DemoStaff>();
  DEMO_STAFF.forEach((member, index) => {
    staff.set(member.id, {
      ...member,
      adminId: 20_001 + index,
      englishName: member.id === 'director' ? null : member.name,
      role: member.id === 'director' ? 'Director' : 'Designer',
      wageType: 'percent',
      percentRate: 0,
      hourlyRate: null,
      instagramLink: '',
      active: true,
      workingDays: ALL_WEEKDAYS,
    });
  });
  Object.values(state.staffRecords).forEach((member) => staff.set(member.id, member));
  return Array.from(staff.values(), (member) => ({
    ...member,
    locationId: state.staffLocations[member.id] ?? member.locationId,
  }));
}

export function demoStaff(state: DemoState) {
  return allDemoStaff(state).filter(({ active }) => active);
}

export function saveDemoStaff(profile: DemoStaffProfile, id?: StaffId) {
  return editDemo((state) => {
    const staff = allDemoStaff(state);
    const existing = id ? staff.find((member) => member.id === id && member.active) : undefined;
    if (id && !existing) throw new Error('이 직원은 더 이상 편집할 수 없습니다.');
    const next = existing ?? {
      id: `demo-${crypto.randomUUID()}`,
      adminId: Math.max(...staff.map(({ adminId }) => adminId)) + 1,
      start: 600,
      active: true,
      workingDays: ALL_WEEKDAYS,
    };
    return {
      ...state,
      staffLocations: { ...state.staffLocations, [next.id]: profile.locationId },
      staffRecords: { ...state.staffRecords, [next.id]: { ...next, ...profile } },
    };
  });
}

export function archiveDemoStaff(id: StaffId) {
  return editDemo((state) => {
    const member = demoStaff(state).find((staff) => staff.id === id);
    if (!member) return state;
    return { ...state, staffRecords: { ...state.staffRecords, [id]: { ...member, active: false } } };
  });
}

export function saveDemoWorkingDays(id: StaffId, days: number[]) {
  return editDemo((state) => {
    const member = demoStaff(state).find((staff) => staff.id === id);
    if (!member) throw new Error('직원을 찾을 수 없습니다.');
    return { ...state, staffRecords: { ...state.staffRecords, [id]: {
      ...member, workingDays: ALL_WEEKDAYS.filter((day) => days.includes(day)),
    } } };
  });
}

export function demoStaffWorksOnDay(staff: DemoStaff, day: string) {
  return staff.workingDays.includes(new Date(day + 'T00:00:00Z').getUTCDay());
}

export function setDemoLocationBookable(locationId: HoonsLocationId, bookable: boolean) {
  return editDemo((state) => ({
    ...state,
    closedLocations: bookable
      ? state.closedLocations.filter((id) => id !== locationId)
      : [...new Set([...state.closedLocations, locationId])],
  }));
}

export function transferDemoStaff(staffId: StaffId, locationId: HoonsLocationId) {
  return editDemo((state) => ({
    ...state,
    staffLocations: { ...state.staffLocations, [staffId]: locationId },
  }));
}

export function demoDays(now = new Date()) {
  const parts = sydneyDay.formatToParts(now);
  const year = Number(parts.find(({ type }) => type === 'year')?.value);
  const month = Number(parts.find(({ type }) => type === 'month')?.value);
  const day = Number(parts.find(({ type }) => type === 'day')?.value);
  return Array.from({ length: 7 }, (_, offset) =>
    new Date(Date.UTC(year, month - 1, day + offset + 1)).toISOString().slice(0, 10),
  );
}

export function formatDemoDay(day: string) {
  return calendarDay.format(new Date(day + 'T00:00:00Z'));
}

export function formatDemoTime(start: number) {
  const hour = Math.floor(start / 60);
  const minute = String(start % 60).padStart(2, '0');
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? 'am' : 'pm'}`;
}

export function formatDemoPrice(amount: number) {
  return aud.format(amount);
}

export function demoSlots(state: DemoState, staff: DemoStaff, service: ServiceQuote, day: string) {
  if (state.closedLocations.includes(staff.locationId) || !demoStaffWorksOnDay(staff, day)) return [];
  return Array.from({ length: 6 }, (_, index) => staff.start + 75 * index)
    .filter((start) => start + service.minutes <= DEMO_WORKDAY_END)
    .filter((start) => state.reservations.every((reservation) => {
      if (reservation.staffId !== staff.id || reservation.day !== day) return true;
      const booked = demoReservationService(state, reservation);
      return !booked || start >= reservation.start + booked.minutes
        || start + service.minutes <= reservation.start;
    }));
}

export async function createDemoReservation(selection: Omit<DemoReservation, 'reference' | 'serviceSnapshot'>, quote: ServiceQuote) {
  let saved: DemoReservation | undefined;
  await editDemo((state) => {
    const staff = demoStaff(state).find(({ id }) => id === selection.staffId);
    const service = staff && demoServicesForStaff(state.catalog, staff.id).find(({ id }) => id === selection.serviceId);
    if (!HOONS_LOCATIONS.some(({ id }) => id === selection.locationId) || !staff || !service
      || service.name !== quote.name || service.minutes !== quote.minutes
      || service.price !== quote.price || service.deposit !== quote.deposit
      || staff.locationId !== selection.locationId || !demoDays().includes(selection.day)
      || !demoSlots(state, staff, service, selection.day).includes(selection.start)) {
      return state;
    }

    const reference = `HOONS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    saved = { ...selection, reference, serviceSnapshot: service };
    return { ...state, reservations: [...state.reservations, saved] };
  });
  return saved;
}
