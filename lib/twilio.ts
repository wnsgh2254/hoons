import twilio from 'twilio';
import {
  buildBookingReminderSmsBody,
  formatReminderAppointmentLine,
  resolveReminderServiceLabel,
} from '@/lib/booking-reminder-sms';

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

// Comment: Send booking reminder SMS (legacy helper for manual/admin use)
// Comment: Build human-readable date/time like "18/12 (Thursday) at 6:15pm"
function formatDisplayDateTime(bookingDate: string, bookingTime: string | null): string {
  try {
    const [year, month, day] = bookingDate.split('-').map((v) => Number(v));
    const [hStr, mStr] = (bookingTime ?? '00:00:00').split(':');
    const hour = Number(hStr);
    const minute = Number(mStr);

    const date = new Date(Date.UTC(year, month - 1, day, hour, minute));

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = weekdays[date.getUTCDay()];

    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');

    let displayHour = date.getUTCHours();
    const displayMinute = String(date.getUTCMinutes()).padStart(2, '0');
    const ampm = displayHour >= 12 ? 'pm' : 'am';
    displayHour = displayHour % 12;
    if (displayHour === 0) displayHour = 12;

    return `${dd}/${mm} (${weekday}) at ${displayHour}:${displayMinute}${ampm}`;
  } catch {
    // Comment: Fallback to raw values if parsing fails
    return `${bookingDate} ${bookingTime ?? ''}`.trim();
  }
}

// Comment: Send booking confirmation SMS immediately after a booking is created and deposit is paid
export async function sendBookingConfirmation(params: {
  phone: string;
  bookingDate: string;
  bookingTime: string;
  shopName: string;
  shopLocation: string;
  shopPhone: string | null;
}): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const { phone, bookingDate, bookingTime, shopName, shopLocation, shopPhone } = params;

  const displayText = formatDisplayDateTime(bookingDate, bookingTime);
  const contactLine = shopPhone ? `\n📞 ${shopPhone}` : '';

  const message =
    `Hello, this is Haeyoom 😊\n` +
    `Your appointment is booked for ${displayText}.\n\n` +
    `If you need to change or cancel your booking, please contact the salon.\n\n` +
    `📍 Haeyoom ${shopName}\n` +
    `${shopLocation}` +
    `${contactLine}\n\n` +
    `Thank you!`;

  return sendSMS(phone, message);
}

export type SendBookingReminderVenue = {
  customServiceName?: string | null;
  catalogServiceName?: string | null;
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
  const serviceLabel = resolveReminderServiceLabel(venue?.customServiceName, venue?.catalogServiceName);
  const message = buildBookingReminderSmsBody({
    appointmentLine,
    serviceLabel,
    shopLocation: venue?.shopLocation ?? '',
    shopPhone: venue?.shopPhone,
  });

  return sendSMS(phoneNumber, message);
}

