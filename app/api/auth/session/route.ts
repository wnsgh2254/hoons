import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { User } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let session: { username: string; role: string; expiresAt: string };
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Comment: Check if session is expired
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      cookieStore.delete('admin_session');
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        username: session.username,
        role: session.role,
      } as User,
    });
  } catch (error: any) {
    console.error('Error in session route:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
