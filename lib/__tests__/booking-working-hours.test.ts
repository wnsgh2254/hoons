import { describe, expect, it } from 'vitest';
import { isStartSlotUnavailable } from '@/lib/booking-time-math';
import { isBookingWithinWorkingIntervals } from '@/lib/server-booking-availability';

describe('booking working hours', () => {
  const businessHoursOnly = [{ start: 10 * 60, end: 19 * 60 }];

  it('blocks long bookings past business hours when only business-hour window is set', () => {
    const slotStart = 18 * 60 + 30; // 6:30 PM
    const duration = 150; // ends 9:00 PM

    expect(isBookingWithinWorkingIntervals(slotStart, duration, businessHoursOnly)).toBe(false);
    expect(
      isStartSlotUnavailable(slotStart, duration, {
        fullDayBlocked: false,
        restrictionIntervals: [],
        bookingIntervals: [],
        workingIntervals: businessHoursOnly,
      }),
    ).toBe(true);
  });

  it('allows bookings that end exactly at business close', () => {
    const slotStart = 18 * 60; // 6:00 PM
    const duration = 60; // ends 7:00 PM

    expect(isBookingWithinWorkingIntervals(slotStart, duration, businessHoursOnly)).toBe(true);
    expect(
      isStartSlotUnavailable(slotStart, duration, {
        fullDayBlocked: false,
        restrictionIntervals: [],
        bookingIntervals: [],
        workingIntervals: businessHoursOnly,
      }),
    ).toBe(false);
  });

  it('prefers designer schedule when present (no change to scheduled days)', () => {
    const designerHours = [{ start: 10 * 60, end: 17 * 60 }];
    const slotStart = 16 * 60 + 30;
    const duration = 60;

    expect(isBookingWithinWorkingIntervals(slotStart, duration, designerHours)).toBe(false);
  });
});
