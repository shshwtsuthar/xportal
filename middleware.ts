import { createClient } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { supabase } = createClient(request);

  // Get the pathname
  const path = new URL(request.url).pathname;

  // Add pathname to headers for server components
  const newHeaders = new Headers(request.headers);
  newHeaders.set('x-pathname', path);

  // Public paths that don't require authentication
  const isPublicPath = path.startsWith('/login') || path.startsWith('/auth/');

  // Refresh session if expired
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // Handle errors
  if (error) {
    console.error('Auth error in middleware:', error);
    return NextResponse.redirect(new URL('/auth/auth-error', request.url));
  }

  // If session exists, verify user has proper metadata
  if (session) {
    const { data: userRes, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('User verification error in middleware:', userError);
      return NextResponse.redirect(new URL('/auth/auth-error', request.url));
    }

    // Check if user has required metadata (rto_id)
    const rtoId = (
      userRes.user?.app_metadata as Record<string, unknown> | undefined
    )?.rto_id;
    if (!rtoId) {
      console.error('User missing RTO metadata, redirecting to auth error');
      return NextResponse.redirect(
        new URL('/auth/auth-error?error=missing_rto', request.url)
      );
    }
  }

  // If on a public path (login/auth pages) and logged in, redirect to dashboard
  if (isPublicPath && session && path !== '/auth/callback') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If accessing root and logged in, redirect to dashboard
  if (path === '/' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If on a private path and not logged in, redirect to login
  if (!isPublicPath && !session) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(redirectUrl);
  }

  // If trying to access /users, check if user is admin using app_metadata
  if (path.startsWith('/users')) {
    // Prefer verified user info
    const { data: userRes } = await supabase.auth.getUser();
    const role = (
      userRes.user?.app_metadata as Record<string, unknown> | undefined
    )?.role;
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Return response with updated headers
  const finalResponse = NextResponse.next({
    request: {
      headers: newHeaders,
    },
  });

  return finalResponse;
}

// Specify which paths this middleware should run for
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
