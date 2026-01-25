import { NextRequest, NextResponse } from 'next/server';
import { sendBookingReminder } from '@/lib/twilio';

// Comment: Test endpoint to send booking reminder SMS
// This is for testing the SMS functionality with virtual phone numbers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      phoneNumber, 
      bookingDate, 
      bookingTime, 
      serviceName, 
      designerName 
    } = body;

    if (!phoneNumber || !bookingDate || !bookingTime) {
      return NextResponse.json(
        { error: '전화번호, 예약 날짜, 예약 시간이 필요합니다.' },
        { status: 400 }
      );
    }

    // Comment: Convert bookingTime to 24h format if needed
    let bookingTime24h = bookingTime;
    const timeMatch = bookingTime.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (timeMatch) {
      let [, hh, mm, ap] = timeMatch;
      let hour = parseInt(hh, 10);
      const isPM = ap.toUpperCase() === 'PM';
      if (isPM && hour < 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      bookingTime24h = `${hour.toString().padStart(2, '0')}:${mm}:00`;
    }

    const result = await sendBookingReminder(
      phoneNumber,
      bookingDate,
      bookingTime24h,
      serviceName,
      designerName
    );

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    console.error('Error in test-booking route:', error);
    return NextResponse.json(
      { error: error.message || 'SMS 전송 테스트에 실패했습니다.' },
      { status: 500 }
    );
  }
}
