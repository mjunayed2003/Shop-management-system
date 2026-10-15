import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ENV } from '@/lib/config/env';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${ENV.API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const cookieStore = await cookies();
    const isRemember = Boolean(body.rememberMe);
    const maxAge = isRemember ? 7 * 24 * 60 * 60 : undefined; // 7 days or session

    // Set httpOnly secure cookie
    cookieStore.set('pos_token', data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to authenticate via proxy' },
      { status: 500 },
    );
  }
}
