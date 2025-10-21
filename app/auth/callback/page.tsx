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
      const defaultNext = '/dashboard';

      // 1) PKCE code flow via query param
      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace('/auth/auth-error');
          return;
        }
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
            router.replace('/auth/auth-error');
            return;
          }
          const next =
            nextParam ||
            (type === 'invite' ? '/auth/update-password' : defaultNext);
          router.replace(next);
          return;
        }
      }

      // No recognizable tokens found
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
