/**
 * Xero API Client Helper for Node.js (Next.js API Routes)
 *
 * Provides a utility for making Xero API calls with automatic token management
 * in Node.js runtime (for use in Next.js API routes).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from './encryption';

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
 * Gets Xero credentials for an RTO and makes an API request.
 */
export class XeroClientNode {
  private rtoId: string;
  private supabase: ReturnType<typeof createAdminClient>;
  private encryptionKey: string;

  constructor(rtoId: string) {
    this.rtoId = rtoId;
    this.supabase = createAdminClient();
    this.encryptionKey = process.env.XERO_ENCRYPTION_KEY || '';

    if (!this.encryptionKey) {
      throw new Error(
        'XERO_ENCRYPTION_KEY not set. Token decryption will fail.'
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
      const accessToken = decryptToken(rto.xero_access_token_encrypted);
      const refreshToken = decryptToken(rto.xero_refresh_token_encrypted);
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
   * Makes a request to the Xero API.
   * Note: Token refresh is not implemented here - should be handled by Edge Functions.
   * For webhooks, we assume tokens are valid.
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
