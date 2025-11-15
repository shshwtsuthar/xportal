import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/xero/encryption';

/**
 * Xero OAuth Callback Route
 *
 * Handles the OAuth 2.0 callback from Xero:
 * 1. Exchanges authorization code for access/refresh tokens
 * 2. Retrieves tenant ID from Xero connections endpoint
 * 3. Encrypts and stores tokens in the rtos table
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description') || error;
      console.error('Xero OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?xero_error=${encodeURIComponent(errorDescription)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?xero_error=${encodeURIComponent('Missing authorization code or state')}`
      );
    }

    // Extract RTO ID from state (format: state:rtoId)
    const stateParts = state.split(':');
    if (stateParts.length < 2) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?xero_error=${encodeURIComponent('Invalid state parameter')}`
      );
    }
    const rtoId = stateParts[1];

    const supabase = await createClient();

    // Verify user is authenticated and has access to this RTO
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?xero_error=${encodeURIComponent('Unauthorized')}`
      );
    }

    const userRtoId = (user.app_metadata as Record<string, unknown> | undefined)
      ?.rto_id as string | undefined;
    if (userRtoId !== rtoId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?xero_error=${encodeURIComponent('RTO mismatch')}`
      );
    }

    // Get Xero OAuth configuration
    const clientId = process.env.XERO_CLIENT_ID;
    const clientSecret = process.env.XERO_CLIENT_SECRET;
    const redirectUri = process.env.XERO_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?xero_error=${encodeURIComponent('Xero OAuth not configured')}`
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(
      'https://identity.xero.com/connect/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?xero_error=${encodeURIComponent('Failed to exchange authorization code')}`
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token || !refresh_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?xero_error=${encodeURIComponent('Invalid token response')}`
      );
    }

    // Get tenant ID from Xero connections endpoint
    const connectionsResponse = await fetch(
      'https://api.xero.com/connections',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!connectionsResponse.ok) {
      const errorText = await connectionsResponse.text();
      console.error('Failed to get connections:', errorText);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?xero_error=${encodeURIComponent('Failed to retrieve Xero organization')}`
      );
    }

    const connections = await connectionsResponse.json();
    if (!connections || connections.length === 0) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?xero_error=${encodeURIComponent('No Xero organizations found')}`
      );
    }

    // Use the first organization (in future, could allow user to select)
    const tenantId = connections[0].tenantId;

    // Encrypt tokens
    const encryptedAccessToken = encryptToken(access_token);
    const encryptedRefreshToken = encryptToken(refresh_token);

    // Calculate token expiration time (expires_in is in seconds, typically 1800 = 30 minutes)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 1800));

    // Store tokens and tenant ID in database
    const { error: updateError } = await supabase
      .from('rtos')
      .update({
        xero_tenant_id: tenantId,
        xero_access_token_encrypted: encryptedAccessToken,
        xero_refresh_token_encrypted: encryptedRefreshToken,
        xero_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', rtoId);

    if (updateError) {
      console.error('Failed to store Xero tokens:', updateError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?xero_error=${encodeURIComponent('Failed to store Xero credentials')}`
      );
    }

    // Redirect to settings page with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?xero_connected=true`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Xero callback error:', err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?xero_error=${encodeURIComponent(message)}`
    );
  }
}
