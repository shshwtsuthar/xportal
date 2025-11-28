'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function run() {
      const supabase = createClient();

      const nextParam = searchParams.get('next') || undefined;

      // Helper to get default redirect based on user role
      const getDefaultRedirect = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const role = (user?.app_metadata as Record<string, unknown> | undefined)
          ?.role as string | undefined;
        return role === 'STUDENT' ? '/student' : '/dashboard';
      };

      // 1) PKCE code flow via query param
      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace('/auth/auth-error');
          return;
        }
        const defaultNext = await getDefaultRedirect();
        router.replace(nextParam || defaultNext);
        return;
      }

      // 2) Hash fragment token flow (invite/recovery)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hash.get('access_token');
        const refresh_token = hash.get('refresh_token');
        const token_type = hash.get('token_type');
        const type = hash.get('type');

        if (access_token && refresh_token && token_type) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            console.error('Session set error:', error);
            router.replace('/auth/auth-error');
            return;
          }
          if (nextParam) {
            router.replace(nextParam);
          } else if (type === 'invite') {
            router.replace('/auth/update-password');
          } else {
            const defaultNext = await getDefaultRedirect();
            router.replace(defaultNext);
          }
          return;
        }
      }

      // No recognizable tokens found - redirect to auth error
      console.warn('No auth tokens found in callback URL');
      router.replace('/auth/auth-error');
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="text-muted-foreground text-sm">Completing sign-in…</div>
    </div>
  );
}
