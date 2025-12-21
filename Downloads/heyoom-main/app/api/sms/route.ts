import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { error: '전화번호와 메시지가 필요합니다.' },
        { status: 400 }
      );
    }

    // TODO: Implement SMS service integration
    // Example: Twilio, AWS SNS, or other SMS provider
    console.log('SMS would be sent to:', phone);
    console.log('Message:', message);

    // Placeholder response
    return NextResponse.json(
      { success: true, message: 'SMS 전송이 예약되었습니다.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in SMS route:', error);
    return NextResponse.json(
      { error: 'SMS 전송에 실패했습니다.' },
      { status: 500 }
    );
  }
}



