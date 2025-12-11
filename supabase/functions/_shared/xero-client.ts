/**
 * Xero API Client Helper for Deno Edge Functions
 *
 * Provides a shared utility for making Xero API calls with automatic token management,
 * error handling, and rate limit awareness in Deno runtime.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types.ts';

const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0';

interface XeroApiError {
  ErrorNumber?: number;
  Type?: string;
  Message?: string;
  ValidationErrors?: Array<{
    Message: string;
    Field: string;
  }>;
}

/**
 * AES-256-CBC encryption/decryption for Deno (using Web Crypto API)
 * Matches the Node.js implementation in lib/xero/encryption.ts
 */
async function encryptToken(token: string, key: string): Promise<string> {
  // Ensure key is exactly 32 bytes (256 bits)
  const keyData = new TextEncoder().encode(key.slice(0, 32).padEnd(32, '0'));

  // Import key for AES-CBC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );

  // Generate random IV (16 bytes for AES-CBC)
  const iv = crypto.getRandomValues(new Uint8Array(16));

  // Encrypt
  const data = new TextEncoder().encode(token);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    data
  );

  // Convert to hex format: iv:encryptedData (matching Node.js format)
  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const encryptedHex = Array.from(new Uint8Array(encrypted))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${ivHex}:${encryptedHex}`;
}

async function decryptToken(
  encryptedToken: string,
  key: string
): Promise<string> {
  // Ensure key is exactly 32 bytes (256 bits)
  const keyData = new TextEncoder().encode(key.slice(0, 32).padEnd(32, '0'));

  // Parse format: iv:encryptedData (hex encoded)
  const parts = encryptedToken.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted token format');
  }

  // Convert hex strings to Uint8Array
  const iv = new Uint8Array(
    parts[0].match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  const encrypted = new Uint8Array(
    parts[1].match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  // Import key for AES-CBC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Gets Xero credentials for an RTO and makes an API request.
 */
export class XeroClient {
  private rtoId: string;
  private supabase: ReturnType<typeof createClient<Database>>;
  private encryptionKey: string;

  constructor(rtoId: string) {
    this.rtoId = rtoId;
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        'SUPABASE_URL and SERVICE_ROLE_KEY must be set in environment'
      );
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

    this.encryptionKey = Deno.env.get('XERO_ENCRYPTION_KEY') || '';
    if (!this.encryptionKey) {
      throw new Error(
        'XERO_ENCRYPTION_KEY not set. Token decryption will fail. Set it in Supabase config or environment.'
      );
    }
  }

  /**
   * Gets decrypted Xero credentials for the RTO.
   */
  private async getCredentials(): Promise<{
    accessToken: string;
    refreshToken: string;
    tenantId: string;
    expiresAt: Date | null;
  }> {
    const { data: rto, error } = await this.supabase
      .from('rtos')
      .select(
        'xero_access_token_encrypted, xero_refresh_token_encrypted, xero_tenant_id, xero_token_expires_at'
      )
      .eq('id', this.rtoId)
      .single();

    if (error || !rto) {
      throw new Error(
        `RTO not found or Xero not configured: ${error?.message}`
      );
    }

    if (
      !rto.xero_access_token_encrypted ||
      !rto.xero_refresh_token_encrypted ||
      !rto.xero_tenant_id
    ) {
      throw new Error('Xero not connected for this RTO');
    }

    try {
      const accessToken = await decryptToken(
        rto.xero_access_token_encrypted,
        this.encryptionKey
      );
      const refreshToken = await decryptToken(
        rto.xero_refresh_token_encrypted,
        this.encryptionKey
      );
      const expiresAt = rto.xero_token_expires_at
        ? new Date(rto.xero_token_expires_at)
        : null;

      return {
        accessToken,
        refreshToken,
        tenantId: rto.xero_tenant_id,
        expiresAt,
      };
    } catch (decryptError) {
      throw new Error(
        `Failed to decrypt Xero tokens: ${decryptError instanceof Error ? decryptError.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Refreshes the access token using the refresh token.
   */
  private async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const clientId = Deno.env.get('XERO_CLIENT_ID');
    const clientSecret = Deno.env.get('XERO_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Xero OAuth credentials not configured');
    }

    const credentials = btoa(`${clientId}:${clientSecret}`);

    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${errorText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 1800,
    };
  }

  /**
   * Makes a request to the Xero API with automatic token refresh if needed.
   */
  async request(
    method: string,
    endpoint: string,
    options?: {
      body?: unknown;
      headers?: Record<string, string>;
    }
  ): Promise<Response> {
    const credentials = await this.getCredentials();

    // Check if token is expired or expiring soon (within 5 minutes)
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    if (credentials.expiresAt && credentials.expiresAt <= fiveMinutesFromNow) {
      // Refresh token
      try {
        const { accessToken, expiresIn } = await this.refreshAccessToken(
          credentials.refreshToken
        );
        credentials.accessToken = accessToken;

        // Update stored token (encrypt and save)
        const encryptedAccessToken = await encryptToken(
          accessToken,
          this.encryptionKey
        );
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

        await this.supabase
          .from('rtos')
          .update({
            xero_access_token_encrypted: encryptedAccessToken,
            xero_token_expires_at: expiresAt.toISOString(),
          })
          .eq('id', this.rtoId);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Continue with potentially expired token - will fail with 401 and can be handled upstream
      }
    }

    const url = `${XERO_API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Xero-Tenant-Id': credentials.tenantId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    return response;
  }

  /**
   * Parses Xero API error response into a readable error message.
   */
  static parseError(response: Response, responseText: string): string {
    try {
      const errorData = JSON.parse(responseText) as {
        ApiExceptions?: XeroApiError[];
      };

      if (errorData.ApiExceptions && errorData.ApiExceptions.length > 0) {
        const exception = errorData.ApiExceptions[0];
        if (
          exception.ValidationErrors &&
          exception.ValidationErrors.length > 0
        ) {
          const validationErrors = exception.ValidationErrors.map(
            (e) => `${e.Field}: ${e.Message}`
          ).join('; ');
          return `${exception.Message || 'Validation error'}: ${validationErrors}`;
        }
        return exception.Message || 'Xero API error';
      }
    } catch {
      // If parsing fails, return raw text
    }

    // Fallback to status text or generic error
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      return `Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}s` : ''}`;
    }

    if (response.status === 401) {
      return 'Authentication failed. Please reconnect Xero.';
    }

    return `Xero API error (${response.status}): ${responseText.slice(0, 200)}`;
  }
}
