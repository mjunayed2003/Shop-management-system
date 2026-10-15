import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ENV } from '@/lib/config/env';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pos_token')?.value;

    if (token) {
      // Call backend to revoke active session
      try {
        await fetch(`${ENV.API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // Continue clearing cookie even if backend fails
      }
    }

    cookieStore.delete('pos_token');

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to logout' },
      { status: 500 },
    );
  }
}
