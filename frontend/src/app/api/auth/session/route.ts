import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ENV } from '@/lib/config/env';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pos_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'No active session' }, { status: 401 });
    }

    const response = await fetch(`${ENV.API_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      cookieStore.delete('pos_token');
      return NextResponse.json(data, { status: response.status });
    }

    // Return profile data and pass accessToken to client memory
    return NextResponse.json({
      ...data,
      accessToken: token,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to restore session' },
      { status: 500 },
    );
  }
}
