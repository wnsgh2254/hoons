import twilio from 'twilio';
import {
  buildBookingReminderSmsBody,
  formatReminderAppointmentLine,
} from '@/lib/booking-reminder-sms';
import { stripPromoFromConfirmationSmsServiceLabel } from '@/lib/booking-confirmation-sms';
import { haeyoomSmsHeader, smsServiceLabelEn, smsVenueLocationForReminder } from '@/lib/public-booking-labels';

// Comment: Get Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumberEnv = process.env.TWILIO_PHONE_NUMBER; // Comment: Your Twilio phone number

// Comment: Initialize Twilio client
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Comment: Normalize Australian mobile numbers to E.164 (+61)
function toE164Au(phone: string): string {
  const digits = phone.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('61') && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `+61${digits.slice(1)}`;
  }
  return phone;
}

// Comment: Send SMS message using Twilio (used for manual/admin sends)
export async function sendSMS(
  to: string,
  body: string,
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  if (!client) {
    console.error(
      'Twilio client not initialized. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.',
    );
    return { success: false, error: 'Twilio client not initialized' };
  }

  const fromNumber = fromNumberEnv || '+61485038002';
  const toNumber = toE164Au(to);

  try {
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to: toNumber,
    });

    console.log(`SMS sent successfully. Message SID: ${message.sid}`);
    console.log(`From ${fromNumber} to ${toNumber}`);
    return { success: true, messageSid: message.sid };
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message || 'Failed to send SMS' };
  }
}

// Comment: Format AU salon number for SMS (e.g. +61432… or 0432… -> 0432 328 002).
function formatAuPhoneForSmsDisplay(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const digits = s.replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('61') && local.length >= 9) {
    local = `0${local.slice(2)}`;
  }
  if (local.startsWith('0') && local.length === 10) {
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  if (local.length >= 8) {
    return s;
  }
  return s;
}

// Comment: Booking confirmation SMS right after a booking is created or deposit is paid (public + admin).
export async function sendBookingConfirmation(params: {
  phone: string;
  bookingDate: string;
  bookingTime: string;
  shopName: string;
  serviceName: string;
  venuePhone: string | null;
}): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const { phone, bookingDate, bookingTime, shopName, serviceName, venuePhone } = params;
  const serviceLine = stripPromoFromConfirmationSmsServiceLabel(serviceName);

  const appointmentLine = formatReminderAppointmentLine(bookingDate, bookingTime);
  const formattedContact = formatAuPhoneForSmsDisplay(venuePhone);
  const rawVenuePhone = String(venuePhone ?? '').trim();
  const contactPhone: string | null =
    formattedContact ?? (rawVenuePhone.length > 0 ? rawVenuePhone : null);
  const contactInstruction = contactPhone
    ? `Call or Text to ${contactPhone}`
    : 'Call or Text your Haeyoom location';

  const message =
    `${haeyoomSmsHeader(shopName)}\n\n` +
    `Appointment: \n` +
    `${appointmentLine} \n` +
    `Service: ${serviceLine}\n\n` +
    `To Change or Cancel: \n` +
    `${contactInstruction}\n` +
    `Deposit Policy:\n` +
    `* 3+ days: Last day for 100% refund\n` +
    `* 1-2 days before: 50% refund\n` +
    `* Same-day: Non-refundable\n` +
    `* Late over 10 mins: Auto-canceled`;

  return sendSMS(phone, message);
}

export type SendBookingReminderVenue = {
  customServiceName?: string | null;
  catalogServiceName?: string | null;
  catalogEnglishName?: string | null;
  shopName?: string | null;
  shopLocation?: string | null;
  shopPhone?: string | null;
};

// Comment: 3-day reminder template — matches Edge Function `booking-reminder` (venue-aware location & phone).
export async function sendBookingReminder(
  phoneNumber: string,
  bookingDate: string,
  bookingTime: string,
  venue?: SendBookingReminderVenue,
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const appointmentLine = formatReminderAppointmentLine(bookingDate, bookingTime);
  const serviceLabel = smsServiceLabelEn(
    venue?.catalogEnglishName,
    venue?.catalogServiceName,
    venue?.customServiceName,
  );
  const message = buildBookingReminderSmsBody({
    appointmentLine,
    serviceLabel,
    shopLocation: smsVenueLocationForReminder(venue?.shopLocation, venue?.shopName),
    shopPhone: venue?.shopPhone,
  });

  return sendSMS(phoneNumber, message);
}

