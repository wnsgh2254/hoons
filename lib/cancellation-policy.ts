const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type CancellationRefundBand = 'full' | 'half' | 'none';

export type CancellationRefundPolicy = {
  appointmentDate: string;
  todaySydney: string;
  daysBeforeAppointment: number;
  refundRate: number;
  refundBand: CancellationRefundBand;
  label: string;
};

function getSydneyDateParts(value: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(value);
  const year = Number(parts.find((part) => part.type === 'year')?.value || 0);
  const month = Number(parts.find((part) => part.type === 'month')?.value || 0);
  const day = Number(parts.find((part) => part.type === 'day')?.value || 0);

  return { year, month, day };
}

function toSydneyDateKey(value: Date): string {
  const { year, month, day } = getSydneyDateParts(value);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dateKeyToUtcMidnight(dateKey: string): number {
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return Number.NaN;
  }

  return Date.UTC(year, month - 1, day);
}

export function getCancellationRefundPolicy(
  appointmentDate: string | null | undefined,
  now: Date = new Date(),
): CancellationRefundPolicy {
  const safeAppointmentDate =
    typeof appointmentDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)
      ? appointmentDate
      : toSydneyDateKey(now);

  const todaySydney = toSydneyDateKey(now);
  const appointmentUtcMidnight = dateKeyToUtcMidnight(safeAppointmentDate);
  const todayUtcMidnight = dateKeyToUtcMidnight(todaySydney);

  const daysBeforeAppointment =
    Number.isFinite(appointmentUtcMidnight) && Number.isFinite(todayUtcMidnight)
      ? Math.floor((appointmentUtcMidnight - todayUtcMidnight) / MS_PER_DAY)
      : 0;

  if (daysBeforeAppointment >= 3) {
    return {
      appointmentDate: safeAppointmentDate,
      todaySydney,
      daysBeforeAppointment,
      refundRate: 1,
      refundBand: 'full',
      label: '3+ days before appointment - 100% refund',
    };
  }

  if (daysBeforeAppointment >= 1) {
    return {
      appointmentDate: safeAppointmentDate,
      todaySydney,
      daysBeforeAppointment,
      refundRate: 0.5,
      refundBand: 'half',
      label: '1-2 days before appointment - 50% refund',
    };
  }

  return {
    appointmentDate: safeAppointmentDate,
    todaySydney,
    daysBeforeAppointment,
    refundRate: 0,
    refundBand: 'none',
    label: 'Same-day or past appointment - no refund',
  };
}

export function calculatePolicyRefundAmount(
  depositPaidAud: number,
  appointmentDate: string | null | undefined,
  now: Date = new Date(),
): CancellationRefundPolicy & { refundAmountAud: number } {
  const policy = getCancellationRefundPolicy(appointmentDate, now);
  const depositPaid = Math.max(0, Number(depositPaidAud) || 0);
  const refundAmountAud = Math.round(depositPaid * policy.refundRate * 100) / 100;

  return {
    ...policy,
    refundAmountAud,
  };
}
