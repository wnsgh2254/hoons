import { NextRequest, NextResponse } from 'next/server';
import { sendMobileMessageSMS } from '@/lib/mobile-message';

// Comment: Local/dev test endpoint for Mobile Message SMS
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production.' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { to, message, customerName } = body as {
      to?: string;
      message?: string;
      customerName?: string;
    };

    if (!to) {
      return NextResponse.json({ error: 'to (phone number) is required.' }, { status: 400 });
    }

    const bodyText =
      message?.trim() ||
      `Hi ${customerName?.trim() || 'there'},\n\nThis is a test SMS from Hoons (Mobile Message).\n\nIf you received this, local SMS integration is working.`;

    const result = await sendMobileMessageSMS(to, bodyText);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'SMS test failed';
    console.error('mobile-message test route:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
