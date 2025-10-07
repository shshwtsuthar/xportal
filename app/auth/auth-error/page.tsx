'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const isMissingRTO = error === 'missing_rto';

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {isMissingRTO ? 'Account Setup Required' : 'Authentication Error'}
          </CardTitle>
          <CardDescription>
            {isMissingRTO
              ? 'Your account needs to be properly configured.'
              : 'There was a problem with your authentication request.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {isMissingRTO ? (
                <>
                  Your account is missing required organization information.
                  Please contact your administrator or sign out and use the
                  correct credentials.
                </>
              ) : (
                <>
                  This could be due to an expired link, invalid token, or a
                  system error. Please try signing in again.
                </>
              )}
            </p>
            <div className="space-y-2">
              <Button variant="default" className="w-full" asChild>
                <Link href="/login">Return to Login</Link>
              </Button>
              {isMissingRTO && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSignOut}
                >
                  Sign Out and Try Again
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
