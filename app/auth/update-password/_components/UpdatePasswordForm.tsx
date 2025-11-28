'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function UpdatePasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Also support hash tokens if user landed directly with fragment
  useEffect(() => {
    async function maybeSetSessionFromHash() {
      if (typeof window === 'undefined' || !window.location.hash) return;
      const hash = new URLSearchParams(window.location.hash.substring(1));
      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');
      const token_type = hash.get('token_type');
      if (access_token && refresh_token && token_type) {
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) setError(error.message);
      }
    }
    maybeSetSessionFromHash();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      toast.success('Password updated successfully');

      // Check if user is a student and redirect accordingly
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userRole = (
        user?.app_metadata as Record<string, unknown> | undefined
      )?.role;

      if (userRole === 'STUDENT') {
        router.push('/student');
      } else {
        router.push('/login');
      }
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to update password');
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-destructive text-sm">{error}</div>}
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          disabled={isLoading}
          minLength={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          disabled={isLoading}
          minLength={8}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Updating...' : 'Update Password'}
      </Button>
    </form>
  );
}
