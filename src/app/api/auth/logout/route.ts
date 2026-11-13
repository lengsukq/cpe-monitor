import { NextResponse } from 'next/server';
import { withBasePath } from '@/lib/base-path';

export async function GET(request: Request) {
  const loginPath = withBasePath('/login', process.env.BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH || '');
  const response = NextResponse.redirect(new URL(loginPath, request.url));
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
