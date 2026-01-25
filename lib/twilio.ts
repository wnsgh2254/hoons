import twilio from 'twilio';

// Comment: Get Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER; // Comment: Your Twilio phone number

// Comment: Initialize Twilio client
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Comment: Send SMS message using Twilio
// Comment: TEST MODE - Using fixed phone numbers for testing
export async function sendSMS(to: string, body: string): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  if (!client) {
    console.error('Twilio client not initialized. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
    return { success: false, error: 'Twilio client not initialized' };
  }

  // Comment: TEST MODE - Fixed phone numbers
  const testFromNumber = '+17624383149';
  const testToNumber = '+18777804236';

  try {
    const message = await client.messages.create({
      body,
      from: testFromNumber,
      to: testToNumber, // Comment: Always send to test number
    });

    console.log(`SMS sent successfully. Message SID: ${message.sid}`);
    console.log(`Test mode: From ${testFromNumber} to ${testToNumber}`);
    return { success: true, messageSid: message.sid };
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message || 'Failed to send SMS' };
  }
}

// Comment: Send booking reminder SMS (24 hours before booking)
export async function sendBookingReminder(
  phoneNumber: string,
  bookingDate: string,
  bookingTime: string,
  serviceName?: string,
  designerName?: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  // Comment: Format booking date and time for Korean format
  // bookingTime is in format "HH:MM:SS" or "HH:MM"
  const [hours, minutes] = bookingTime.split(':').map(Number);
  const date = new Date(bookingDate);
  date.setHours(hours, minutes || 0, 0, 0);
  
  const formattedDate = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = `${hours.toString().padStart(2, '0')}:${(minutes || 0).toString().padStart(2, '0')}`;

  let message = `[HAEYOOM] 예약 확인 알림\n\n`;
  message += `예약 날짜: ${formattedDate} ${formattedTime}\n`;
  if (serviceName) {
    message += `서비스: ${serviceName}\n`;
  }
  if (designerName) {
    message += `디자이너: ${designerName}\n`;
  }
  message += `\n예약 확인을 위해 미리 연락드립니다. 문의사항이 있으시면 연락주세요.`;

  return sendSMS(phoneNumber, message);
}

// Comment: Calculate when to send reminder (24 hours before booking)
export function calculateReminderTime(bookingDate: string, bookingTime: string): Date {
  const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
  const reminderTime = new Date(bookingDateTime);
  reminderTime.setHours(reminderTime.getHours() - 24);
  return reminderTime;
}

// Comment: Check if reminder should be sent now (for testing or immediate sending)
export function shouldSendReminderNow(bookingDate: string, bookingTime: string): boolean {
  const reminderTime = calculateReminderTime(bookingDate, bookingTime);
  const now = new Date();
  return now >= reminderTime;
}
