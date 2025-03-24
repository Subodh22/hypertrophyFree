import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/reset-password', '/api/auth', '/favicon.ico'];

// API paths and static asset paths to exempt
const exemptPaths = [
  '/_next',
  '/fonts',
  '/images',
  '/api/auth',
  '/api/health',
];

// This middleware runs on every request
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public routes and exempt paths
  if (publicRoutes.includes(pathname) || exemptPaths.some(path => pathname.startsWith(path))) {
    console.log(`Middleware: Allowing public/exempt path: ${pathname}`);
    return NextResponse.next();
  }

  // Check for authentication cookies and headers
  const firebaseCookie = request.cookies.get('firebaseToken')?.value;
  const sessionCookie = request.cookies.get('__session')?.value;
  const authHeader = request.headers.get('Authorization');
  
  // Debug logs
  console.log(`Middleware check: ${pathname}`, { 
    hasCookies: !!firebaseCookie || !!sessionCookie,
    hasAuthHeader: !!authHeader
  });

  // Allow access if user has valid authentication
  if (firebaseCookie || sessionCookie || (authHeader && authHeader.startsWith('Bearer '))) {
    console.log(`Middleware: Authenticated access to ${pathname}`);
    return NextResponse.next();
  }

  // User is not authenticated - redirect to login with return URL
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?returnUrl=${pathname}`;
  
  console.log(`Middleware: Redirecting unauthenticated user to login from ${pathname}`);
  return NextResponse.redirect(url);
}

// Configure paths that this middleware will run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 