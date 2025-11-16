import { createHmac, timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/database.types';

/**
 * Validates Xero webhook signature using HMAC-SHA256.
 *
 * Xero sends webhook signatures in the 'x-xero-signature' header.
 * The signature is computed as: HMAC-SHA256(webhook_key, request_body)
 *
 * @param body - Raw request body as string
 * @param signature - Signature from 'x-xero-signature' header
 * @param webhookKey - Webhook key from rtos.xero_webhook_key
 * @returns true if signature is valid, false otherwise
 */
export function validateXeroWebhookSignature(
  body: string,
  signature: string,
  webhookKey: string
): boolean {
  try {
    // Compute HMAC-SHA256 of the body using the webhook key
    const hmac = createHmac('sha256', webhookKey);
    hmac.update(body);
    const computedSignature = hmac.digest('base64');

    // Use constant-time comparison to prevent timing attacks
    if (signature.length !== computedSignature.length) {
      return false;
    }

    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    console.error('Error validating Xero webhook signature:', error);
    return false;
  }
}

/**
 * Finds RTO by Xero tenant ID and returns RTO ID and webhook key.
 *
 * @param tenantId - Xero tenant ID from 'xero-tenant-id' header
 * @returns Object with rtoId and webhookKey, or null if not found
 */
export async function findRtoByTenantId(
  tenantId: string
): Promise<{ rtoId: string; webhookKey: string | null } | null> {
  const supabase = createAdminClient();

  const { data: rto, error } = await supabase
    .from('rtos')
    .select('id, xero_webhook_key')
    .eq('xero_tenant_id', tenantId)
    .maybeSingle();

  if (error || !rto) {
    console.error('Error finding RTO by tenant ID:', error);
    return null;
  }

  return {
    rtoId: rto.id,
    webhookKey: rto.xero_webhook_key,
  };
}

/**
 * Checks if a webhook event has already been processed (idempotency check).
 *
 * @param rtoId - RTO ID
 * @param resourceId - Xero resource ID (InvoiceID, PaymentID, ContactID)
 * @param eventType - Event type (e.g., 'INVOICE.CREATED')
 * @param eventDateUtc - Event timestamp from Xero
 * @returns true if event was already processed, false otherwise
 */
export async function isEventProcessed(
  rtoId: string,
  resourceId: string,
  eventType: string,
  eventDateUtc: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('xero_webhook_events')
    .select('id')
    .eq('rto_id', rtoId)
    .eq('resource_id', resourceId)
    .eq('event_type', eventType)
    .eq('event_date_utc', eventDateUtc)
    .maybeSingle();

  if (error) {
    console.error('Error checking event idempotency:', error);
    // If there's an error, assume not processed to be safe
    return false;
  }

  return data !== null;
}

/**
 * Records a webhook event in the database for idempotency tracking.
 *
 * @param rtoId - RTO ID
 * @param resourceId - Xero resource ID
 * @param eventType - Event type
 * @param eventCategory - Event category (INVOICE, PAYMENT, CONTACT)
 * @param eventDateUtc - Event timestamp
 * @param payload - Full event payload
 * @returns The inserted event record ID, or null on error
 */
export async function recordWebhookEvent(
  rtoId: string,
  resourceId: string,
  eventType: string,
  eventCategory: string,
  eventDateUtc: string,
  payload: unknown
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('xero_webhook_events')
    .insert({
      rto_id: rtoId,
      resource_id: resourceId,
      event_type: eventType,
      event_category: eventCategory,
      event_date_utc: eventDateUtc,
      payload: payload as Json,
      processed_at: null, // Will be set when processing completes
    })
    .select('id')
    .single();

  if (error) {
    // If it's a unique constraint violation, the event was already recorded (idempotency)
    if (error.code === '23505') {
      console.log('Event already recorded (idempotency):', {
        rtoId,
        resourceId,
        eventType,
        eventDateUtc,
      });
      return null;
    }
    console.error('Error recording webhook event:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Marks a webhook event as processed.
 *
 * @param eventId - Event record ID
 */
export async function markEventProcessed(eventId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('xero_webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', eventId);

  if (error) {
    console.error('Error marking event as processed:', error);
  }
}
