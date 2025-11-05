'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * AuthErrorHandler
 *
 * Global error handler for Supabase auth errors, specifically handles
 * refresh token errors by automatically signing out and redirecting to login.
 */
export function AuthErrorHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const handledRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle session loss during refresh
      if (event === 'TOKEN_REFRESHED' && !session && !handledRef.current) {
        handledRef.current = true;
        await supabase.auth.signOut();
        const isPublicPath =
          pathname.startsWith('/login') ||
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/apply/');

        if (!isPublicPath) {
          const redirectUrl = new URL('/login', window.location.origin);
          redirectUrl.searchParams.set('redirectTo', pathname);
          router.push(redirectUrl.toString());
        }
      }
    });

    // Handle global unhandled errors and promise rejections from Supabase
    const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const error = 'error' in event ? event.error : event.reason;
      const errorMessage =
        error?.message || error?.error_description || String(error || '');

      if (
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('Refresh Token Not Found') ||
        errorMessage.includes('refresh_token_not_found')
      ) {
        if ('preventDefault' in event) {
          event.preventDefault(); // Prevent console error
        }

        if (!handledRef.current) {
          handledRef.current = true;
          supabase.auth.signOut().then(() => {
            const isPublicPath =
              pathname.startsWith('/login') ||
              pathname.startsWith('/auth/') ||
              pathname.startsWith('/apply/');

            if (!isPublicPath) {
              const redirectUrl = new URL('/login', window.location.origin);
              redirectUrl.searchParams.set('redirectTo', pathname);
              router.push(redirectUrl.toString());
            }
          });
        }
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
      handledRef.current = false;
    };
  }, [router, pathname]);

  return <>{children}</>;
}
