import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCredentials } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Comment: Trim whitespace from username and password
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    // Comment: Validate credentials
    const user = validateCredentials(trimmedUsername, trimmedPassword);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Comment: Create session cookie (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const cookieStore = await cookies();
    cookieStore.set('admin_session', JSON.stringify({
      username: user.username,
      role: user.role,
      expiresAt: expiresAt.toISOString(),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Error in login route:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
