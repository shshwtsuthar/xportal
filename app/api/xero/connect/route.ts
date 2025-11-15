import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

/**
 * Xero OAuth Connect Route
 *
 * Initiates the OAuth 2.0 authorization flow by redirecting the user to Xero's
 * authorization endpoint with the required scopes and state parameter.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Ensure requester is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get RTO ID from user metadata
    const rtoId = (user.app_metadata as Record<string, unknown> | undefined)
      ?.rto_id as string | undefined;
    if (!rtoId) {
      return NextResponse.json(
        { error: 'Missing RTO context' },
        { status: 400 }
      );
    }

    // Verify RTO exists
    const { data: rto, error: rtoError } = await supabase
      .from('rtos')
      .select('id')
      .eq('id', rtoId)
      .single();

    if (rtoError || !rto) {
      return NextResponse.json({ error: 'RTO not found' }, { status: 404 });
    }

    // Get Xero OAuth configuration from environment
    const clientId = process.env.XERO_CLIENT_ID;
    const redirectUri = process.env.XERO_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        {
          error:
            'Xero OAuth not configured. Please set XERO_CLIENT_ID and XERO_REDIRECT_URI environment variables.',
        },
        { status: 500 }
      );
    }

    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in session/cookie (simplified - in production, use secure session storage)
    // For now, we'll include RTO ID in state to verify on callback
    const stateWithRto = `${state}:${rtoId}`;

    // Build Xero authorization URL
    const scopes = [
      'offline_access',
      'accounting.transactions',
      'accounting.contacts',
      'accounting.settings',
    ].join(' ');

    const authUrl = new URL(
      'https://login.xero.com/identity/connect/authorize'
    );
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', stateWithRto);

    // Redirect to Xero authorization page
    return NextResponse.redirect(authUrl.toString());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Xero connect error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
