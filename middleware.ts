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
  const isPublicPath =
    path.startsWith('/login') ||
    path.startsWith('/auth/') ||
    path.startsWith('/apply/');

  // For public auth pages, avoid forcing a session refresh before token exchange
  let session = null as Awaited<
    ReturnType<typeof supabase.auth.getSession>
  >['data']['session'];
  let error: unknown = null;
  // Skip forcing token refresh on auth pages (callback/update-password) to avoid refresh_token_not_found
  if (!isPublicPath) {
    try {
      const result = await supabase.auth.getSession();
      session = result.data.session;
      error = result.error;
    } catch (e) {
      error = e;
    }
  }

  // Handle errors: allow auth pages to proceed so they can complete token exchange
  if (error && !isPublicPath) {
    console.error('Auth error in middleware:', error);
    return NextResponse.redirect(new URL('/auth/auth-error', request.url));
  }

  // If session exists, verify user has proper metadata
  if (session) {
    const { data: userRes, error: userError } = await supabase.auth.getUser();

    if (userError) {
      // Auto-recover from stale/invalid session (e.g., user deleted, DB reset)
      // Supabase returns 403 user_not_found when JWT sub does not exist in auth.users
      // In that case, clear session and send user to login instead of auth error loop
      if (userError.status === 403) {
        await supabase.auth.signOut();
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('redirectTo', path);
        return NextResponse.redirect(redirectUrl);
      }
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

    // Get user role from app_metadata for role-based access control
    const role = (
      userRes.user?.app_metadata as Record<string, unknown> | undefined
    )?.role as string | undefined;

    // Define route access rules
    const isStudentRoute = path.startsWith('/student');
    const isStaffRoute =
      path.startsWith('/dashboard') ||
      path.startsWith('/students') ||
      path.startsWith('/applications') ||
      path.startsWith('/financial') ||
      path.startsWith('/agents') ||
      path.startsWith('/programs') ||
      path.startsWith('/subjects') ||
      path.startsWith('/program-plans') ||
      path.startsWith('/timetables') ||
      path.startsWith('/locations') ||
      path.startsWith('/attendance') ||
      path.startsWith('/communications') ||
      path.startsWith('/rto') ||
      path.startsWith('/settings') ||
      path.startsWith('/reports') ||
      path === '/';

    // Role-based access control
    if (role === 'STUDENT') {
      // Students can only access /student routes
      if (isStaffRoute) {
        return NextResponse.redirect(new URL('/student', request.url));
      }
    } else if (role && role !== 'STUDENT') {
      // Staff members (all non-STUDENT roles) cannot access student portal
      if (isStudentRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    // If role is undefined/null, allow access (for backward compatibility during migration)
  }

  // If on a public path (login/auth pages) and logged in, redirect based on role
  // Allow staying on update-password so new invite/recovery users can set a password
  if (
    isPublicPath &&
    session &&
    path !== '/auth/callback' &&
    path !== '/auth/update-password'
  ) {
    // Get user role to determine redirect destination
    const { data: userRes } = await supabase.auth.getUser();
    const role = (
      userRes.user?.app_metadata as Record<string, unknown> | undefined
    )?.role as string | undefined;

    const redirectPath = role === 'STUDENT' ? '/student' : '/dashboard';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // If accessing root and logged in, redirect based on role
  if (path === '/' && session) {
    const { data: userRes } = await supabase.auth.getUser();
    const role = (
      userRes.user?.app_metadata as Record<string, unknown> | undefined
    )?.role as string | undefined;

    const redirectPath = role === 'STUDENT' ? '/student' : '/dashboard';
    return NextResponse.redirect(new URL(redirectPath, request.url));
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
    )?.role as string | undefined;
    if (role !== 'ADMIN') {
      // Redirect to appropriate dashboard based on role
      const redirectPath = role === 'STUDENT' ? '/student' : '/dashboard';
      return NextResponse.redirect(new URL(redirectPath, request.url));
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
