import {
  buildBookingReminderSmsBody,
  formatReminderAppointmentLine,
} from '@/lib/booking-reminder-sms';
import {
  buildBookingConfirmationSmsBody,
  stripPromoFromConfirmationSmsServiceLabel,
  stripPromoFromCustomServiceNameForConfirmationSms,
  nullIfExcludedSmsServiceName,
} from '@/lib/booking-confirmation-sms';
import { sendMobileMessageSMS } from '@/lib/mobile-message';
import { haeyoomSmsHeader, smsServiceLabelEn, smsVenueLocationForReminder } from '@/lib/public-booking-labels';

// Comment: Send SMS via Mobile Message (mobilemessage.com.au)
export async function sendSMS(
  to: string,
  body: string,
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const result = await sendMobileMessageSMS(to, body);
  if (!result.success) {
    return { success: false, error: result.error || 'Failed to send SMS' };
  }
  return { success: true, messageSid: result.messageId };
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
  const message = buildBookingConfirmationSmsBody({
    headerLine: haeyoomSmsHeader(shopName),
    appointmentLine: formatReminderAppointmentLine(bookingDate, bookingTime),
    serviceName: stripPromoFromConfirmationSmsServiceLabel(serviceName),
    venuePhone,
  });

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

// Comment: 3-day reminder template — venue-aware location & phone.
export async function sendBookingReminder(
  phoneNumber: string,
  bookingDate: string,
  bookingTime: string,
  venue?: SendBookingReminderVenue,
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const appointmentLine = formatReminderAppointmentLine(bookingDate, bookingTime);
  const customForSms = stripPromoFromCustomServiceNameForConfirmationSms(venue?.customServiceName);
  const serviceLabel = stripPromoFromConfirmationSmsServiceLabel(
    smsServiceLabelEn(
      nullIfExcludedSmsServiceName(venue?.catalogEnglishName),
      nullIfExcludedSmsServiceName(venue?.catalogServiceName),
      customForSms,
    ),
  );
  const message = buildBookingReminderSmsBody({
    appointmentLine,
    serviceLabel,
    shopLocation: smsVenueLocationForReminder(venue?.shopLocation, venue?.shopName),
    shopPhone: venue?.shopPhone,
  });

  return sendSMS(phoneNumber, message);
}
