import { HOONS_LOCATIONS } from './hoons-locations';
import { allDemoStaff, type DemoState } from './hoons-booking-demo';
import type { Designer } from './types';

export const HOONS_ADMIN_SHOPS = HOONS_LOCATIONS.map((location, index) => ({
  id: 10_001 + index,
  locationKey: location.id,
  name: location.name,
  location: location.suburb,
  address: location.address,
}));

export type HoonsAdminStaff = Designer & {
  staffKey: string;
  shop_name: string;
  start: number;
  workingDays: number[];
};

export function hoonsAdminStaff(state: DemoState): HoonsAdminStaff[] {
  return allDemoStaff(state).map((member) => {
    const shop = HOONS_ADMIN_SHOPS.find(({ locationKey }) => locationKey === member.locationId);
    return {
      staffKey: member.id,
      id: member.adminId,
      name: member.name,
      english_name: member.englishName,
      shop_id: shop?.id ?? null,
      shop_name: shop?.name ?? '',
      role: member.role,
      wage_type: member.wageType,
      percent_rate: member.percentRate,
      hourly_rate: member.hourlyRate,
      instagramLink: member.instagramLink,
      is_active: member.active,
      start: member.start,
      workingDays: member.workingDays,
      created_at: '',
    };
  });
}
