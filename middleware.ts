import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only redirect the root path to /swagger
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/swagger', request.url));
  }
  return NextResponse.next();
}

// Configure paths that will trigger this middleware
export const config = {
  matcher: '/',
};
