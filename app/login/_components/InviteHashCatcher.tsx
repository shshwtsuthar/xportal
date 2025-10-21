'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export const InviteHashCatcher = () => {
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirectTo = searchParams.get('redirectTo');
    if (!redirectTo) return;

    // If redirected to /login with redirectTo containing an encoded hash from Supabase
    // (e.g. "/%23access_token=..."), forward to update-password with the original hash
    const decoded = decodeURIComponent(redirectTo);
    if (decoded.startsWith('/#')) {
      const hash = decoded.slice(1); // remove leading '/'
      window.location.replace(`/auth/update-password${hash}`);
    }
  }, [searchParams]);

  return null;
};
