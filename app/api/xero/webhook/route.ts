import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  validateXeroWebhookSignature,
  findRtoByTenantId,
  isEventProcessed,
  recordWebhookEvent,
  markEventProcessed,
} from '@/lib/xero/webhook';
import { XeroClientNode } from '@/lib/xero/xero-client-node';
import type { Json } from '@/database.types';

export const runtime = 'nodejs';

/**
 * Xero Webhook Event Types
 */
type XeroWebhookEvent = {
  resourceId: string;
  resourceType: string;
  eventType: string;
  eventCategory: string;
  eventDateUtc: string;
  tenantId?: string; // Present in event payload
  resourceUrl?: string; // Present in event payload
  tenantType?: string; // Present in event payload
};

type XeroWebhookPayload = {
  events?: XeroWebhookEvent[];
  entropy?: string; // Present in "Intent to Receive" validation requests
  lastEventSequence?: number;
  firstEventSequence?: number;
};

/**
 * Maps Xero invoice status to SMS invoice status
 */
function mapXeroInvoiceStatusToSms(
  xeroStatus: string
): 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'OVERDUE' | 'SCHEDULED' | null {
  switch (xeroStatus) {
    case 'DRAFT':
      return 'DRAFT';
    case 'SUBMITTED':
    case 'AUTHORISED':
      return 'SENT';
    case 'PAID':
      return 'PAID';
    case 'VOIDED':
      return 'VOID';
    default:
      return null;
  }
}

/**
 * Handles INVOICE.CREATED and INVOICE.UPDATED events
 */
async function handleInvoiceEvent(
  rtoId: string,
  event: XeroWebhookEvent,
  payload: unknown
): Promise<void> {
  const supabase = createAdminClient();
  const invoiceId = event.resourceId;

  // Find invoice by xero_invoice_id
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, amount_due_cents, amount_paid_cents, status')
    .eq('rto_id', rtoId)
    .eq('xero_invoice_id', invoiceId)
    .maybeSingle();

  if (invoiceError) {
    console.error('Error finding invoice for webhook:', invoiceError);
    return;
  }

  if (!invoice) {
    // Invoice not synced from SMS yet, skip
    console.log(
      `Invoice ${invoiceId} not found in SMS (not synced yet), skipping webhook update`
    );
    return;
  }

  // Fetch invoice from Xero API to get latest details
  try {
    const xeroClient = new XeroClientNode(rtoId);
    const response = await xeroClient.request('GET', `/Invoices/${invoiceId}`);
    const responseText = await response.text();

    if (!response.ok) {
      const errorMessage = XeroClientNode.parseError(response, responseText);
      console.error(`Error fetching invoice from Xero: ${errorMessage}`);
      return;
    }

    const xeroData = JSON.parse(responseText) as {
      Invoices?: Array<{
        InvoiceID?: string;
        Status?: string;
        AmountPaid?: string;
        AmountDue?: string;
        Total?: string;
      }>;
    };

    const xeroInvoice = xeroData.Invoices?.[0];
    if (!xeroInvoice) {
      console.error('Xero invoice not found in response');
      return;
    }

    // Convert Xero amounts (dollars) to cents
    const amountPaidCents = xeroInvoice.AmountPaid
      ? Math.round(parseFloat(xeroInvoice.AmountPaid) * 100)
      : 0;
    const amountDueCents = xeroInvoice.AmountDue
      ? Math.round(parseFloat(xeroInvoice.AmountDue) * 100)
      : invoice.amount_due_cents;

    // Map Xero status to SMS status
    const smsStatus = mapXeroInvoiceStatusToSms(xeroInvoice.Status || '');

    // Update invoice
    const updates: {
      amount_paid_cents: number;
      amount_due_cents: number;
      xero_synced_at: string;
      status?: 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'OVERDUE' | 'SCHEDULED';
    } = {
      amount_paid_cents: amountPaidCents,
      amount_due_cents: amountDueCents,
      xero_synced_at: new Date().toISOString(),
    };

    if (smsStatus) {
      updates.status = smsStatus;
    }

    await supabase.from('invoices').update(updates).eq('id', invoice.id);

    console.log(
      `Updated invoice ${invoice.id} from Xero webhook: ${event.eventType}`
    );
  } catch (error) {
    console.error('Error processing invoice webhook:', error);
    throw error;
  }
}

/**
 * Handles PAYMENT.CREATED and PAYMENT.UPDATED events
 */
async function handlePaymentEvent(
  rtoId: string,
  event: XeroWebhookEvent,
  payload: unknown
): Promise<void> {
  const supabase = createAdminClient();
  const paymentId = event.resourceId;

  // Check if payment already exists by xero_payment_id
  const { data: existingPayment, error: paymentError } = await supabase
    .from('payments')
    .select('id, invoice_id')
    .eq('rto_id', rtoId)
    .eq('xero_payment_id', paymentId)
    .maybeSingle();

  if (paymentError) {
    console.error('Error checking for existing payment:', paymentError);
    return;
  }

  // Fetch payment from Xero API
  try {
    const xeroClient = new XeroClientNode(rtoId);
    const response = await xeroClient.request('GET', `/Payments/${paymentId}`);
    const responseText = await response.text();

    if (!response.ok) {
      const errorMessage = XeroClientNode.parseError(response, responseText);
      console.error(`Error fetching payment from Xero: ${errorMessage}`);
      return;
    }

    const xeroData = JSON.parse(responseText) as {
      Payments?: Array<{
        PaymentID?: string;
        Invoice?: { InvoiceID?: string };
        Amount?: string;
        Date?: string;
        Reference?: string;
      }>;
    };

    const xeroPayment = xeroData.Payments?.[0];
    if (!xeroPayment || !xeroPayment.Invoice?.InvoiceID) {
      console.error('Xero payment or invoice ID not found in response');
      return;
    }

    // Find invoice by xero_invoice_id
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id')
      .eq('rto_id', rtoId)
      .eq('xero_invoice_id', xeroPayment.Invoice.InvoiceID)
      .maybeSingle();

    if (invoiceError || !invoice) {
      console.error(
        `Invoice not found for payment: ${xeroPayment.Invoice.InvoiceID}`
      );
      return;
    }

    // Convert amount from dollars to cents
    const amountCents = xeroPayment.Amount
      ? Math.round(parseFloat(xeroPayment.Amount) * 100)
      : 0;

    if (existingPayment) {
      // Payment exists, update it
      await supabase
        .from('payments')
        .update({
          amount_cents: amountCents,
          payment_date:
            xeroPayment.Date || new Date().toISOString().split('T')[0],
          xero_sync_status: 'synced',
          xero_synced_at: new Date().toISOString(),
        })
        .eq('id', existingPayment.id);

      console.log(`Updated payment ${existingPayment.id} from Xero webhook`);
    } else {
      // New payment - create it using record_payment function
      const { data: paymentResult, error: recordError } = await supabase.rpc(
        'record_payment',
        {
          p_invoice_id: invoice.id ?? undefined, // Convert null to undefined
          p_payment_date:
            xeroPayment.Date || new Date().toISOString().split('T')[0],
          p_amount_cents: amountCents,
          p_notes: xeroPayment.Reference
            ? `Xero Payment: ${xeroPayment.Reference}`
            : undefined,
        }
      );

      if (recordError) {
        console.error('Error recording payment:', recordError);
        return;
      }

      // Get the created payment ID (record_payment returns the payment_id)
      const paymentIdUuid = paymentResult as string | null;
      if (paymentIdUuid) {
        // Update payment with xero_payment_id
        await supabase
          .from('payments')
          .update({
            xero_payment_id: paymentId,
            xero_sync_status: 'synced',
            xero_synced_at: new Date().toISOString(),
          })
          .eq('id', paymentIdUuid);

        console.log(
          `Created payment ${paymentIdUuid} from Xero webhook: ${event.eventType}`
        );
      }
    }
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    throw error;
  }
}

/**
 * Handles CONTACT.CREATED and CONTACT.UPDATED events
 */
async function handleContactEvent(
  rtoId: string,
  event: XeroWebhookEvent,
  payload: unknown
): Promise<void> {
  const supabase = createAdminClient();
  const contactId = event.resourceId;

  // Find student by xero_contact_id
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id')
    .eq('rto_id', rtoId)
    .eq('xero_contact_id', contactId)
    .maybeSingle();

  if (studentError) {
    console.error('Error finding student for webhook:', studentError);
    return;
  }

  if (!student) {
    // Contact not synced from SMS yet, skip
    console.log(
      `Contact ${contactId} not found in SMS (not synced yet), skipping webhook update`
    );
    return;
  }

  // Fetch contact from Xero API to get latest details
  try {
    const xeroClient = new XeroClientNode(rtoId);
    const response = await xeroClient.request('GET', `/Contacts/${contactId}`);
    const responseText = await response.text();

    if (!response.ok) {
      const errorMessage = XeroClientNode.parseError(response, responseText);
      console.error(`Error fetching contact from Xero: ${errorMessage}`);
      return;
    }

    const xeroData = JSON.parse(responseText) as {
      Contacts?: Array<{
        ContactID?: string;
        EmailAddress?: string;
        Phones?: Array<{
          PhoneType?: string;
          PhoneNumber?: string;
        }>;
        Addresses?: Array<{
          AddressType?: string;
          AddressLine1?: string;
          City?: string;
          PostalCode?: string;
          Country?: string;
        }>;
      }>;
    };

    const xeroContact = xeroData.Contacts?.[0];
    if (!xeroContact) {
      console.error('Xero contact not found in response');
      return;
    }

    // Update student contact information
    // Note: We only update if the contact was originally created from SMS
    // (has xero_contact_id). This prevents overwriting SMS data with Xero data
    // for contacts that were created in Xero first.

    const updates: {
      email?: string;
      mobile_phone?: string;
    } = {};

    if (xeroContact.EmailAddress) {
      updates.email = xeroContact.EmailAddress;
    }

    // Get primary phone (MOBILE or DEFAULT)
    const primaryPhone =
      xeroContact.Phones?.find((p) => p.PhoneType === 'MOBILE') ||
      xeroContact.Phones?.find((p) => p.PhoneType === 'DEFAULT');
    if (primaryPhone?.PhoneNumber) {
      updates.mobile_phone = primaryPhone.PhoneNumber;
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('students').update(updates).eq('id', student.id);
      console.log(
        `Updated student ${student.id} contact info from Xero webhook: ${event.eventType}`
      );
    }
  } catch (error) {
    console.error('Error processing contact webhook:', error);
    throw error;
  }
}

/**
 * Processes a single webhook event
 */
async function processWebhookEvent(
  rtoId: string,
  event: XeroWebhookEvent,
  payload: unknown
): Promise<void> {
  const { resourceId, eventType, eventCategory, eventDateUtc } = event;

  // Check idempotency
  const alreadyProcessed = await isEventProcessed(
    rtoId,
    resourceId,
    eventType,
    eventDateUtc
  );

  if (alreadyProcessed) {
    console.log('Event already processed (idempotency):', {
      rtoId,
      resourceId,
      eventType,
      eventDateUtc,
    });
    return;
  }

  // Record event (for idempotency tracking)
  const eventRecordId = await recordWebhookEvent(
    rtoId,
    resourceId,
    eventType,
    eventCategory,
    eventDateUtc,
    payload
  );

  if (!eventRecordId) {
    // Event was already recorded (unique constraint violation)
    console.log('Event already recorded:', { rtoId, resourceId, eventType });
    return;
  }

  try {
    // Process event based on category
    // Xero sends: eventCategory="INVOICE", eventType="UPDATE" or "CREATE"
    // Not: eventType="INVOICE.UPDATED"
    if (eventCategory === 'INVOICE') {
      if (
        eventType === 'CREATE' ||
        eventType === 'UPDATE' ||
        eventType === 'INVOICE.CREATED' ||
        eventType === 'INVOICE.UPDATED'
      ) {
        await handleInvoiceEvent(rtoId, event, payload);
      } else {
        console.log(`Unhandled invoice event type: ${eventType}`, event);
      }
    } else if (eventCategory === 'PAYMENT') {
      if (
        eventType === 'CREATE' ||
        eventType === 'UPDATE' ||
        eventType === 'PAYMENT.CREATED' ||
        eventType === 'PAYMENT.UPDATED'
      ) {
        await handlePaymentEvent(rtoId, event, payload);
      } else {
        console.log(`Unhandled payment event type: ${eventType}`, event);
      }
    } else if (eventCategory === 'CONTACT') {
      if (
        eventType === 'CREATE' ||
        eventType === 'UPDATE' ||
        eventType === 'CONTACT.CREATED' ||
        eventType === 'CONTACT.UPDATED'
      ) {
        await handleContactEvent(rtoId, event, payload);
      } else {
        console.log(`Unhandled contact event type: ${eventType}`, event);
      }
    } else {
      console.log(`Unhandled event category: ${eventCategory}`, event);
    }

    // Mark event as processed
    await markEventProcessed(eventRecordId);
  } catch (error) {
    console.error('Error processing webhook event:', error, event);
    // Don't mark as processed so it can be retried
  }
}

/**
 * Finds RTO by validating webhook signature against all RTOs with webhook keys.
 * Used for "Intent to Receive" validation when tenant ID is not available.
 */
async function findRtoByWebhookSignature(
  bodyText: string,
  signature: string
): Promise<{ rtoId: string; webhookKey: string } | null> {
  const supabase = createAdminClient();

  // Get all RTOs with webhook keys configured
  const { data: rtos, error } = await supabase
    .from('rtos')
    .select('id, xero_webhook_key')
    .not('xero_webhook_key', 'is', null);

  if (error || !rtos) {
    console.error('Error fetching RTOs for signature validation:', error);
    return null;
  }

  // Try each webhook key until we find a match
  for (const rto of rtos) {
    if (rto.xero_webhook_key) {
      const isValid = validateXeroWebhookSignature(
        bodyText,
        signature,
        rto.xero_webhook_key
      );
      if (isValid) {
        return {
          rtoId: rto.id,
          webhookKey: rto.xero_webhook_key,
        };
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body text (required for HMAC signature validation)
    const bodyText = await req.text();

    // Extract headers
    const signature = req.headers.get('x-xero-signature');
    const tenantId = req.headers.get('xero-tenant-id');

    // Parse webhook payload early to check if it's a validation request
    let payload: XeroWebhookPayload;
    try {
      payload = JSON.parse(bodyText);
    } catch (error) {
      console.error('Error parsing webhook payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Check if this is an "Intent to Receive" validation request
    // Validation requests have entropy AND empty events array
    const events = payload.events || [];
    const isValidationRequest = !!payload.entropy && events.length === 0;
    console.log(
      'Is validation request:',
      isValidationRequest,
      '(entropy:',
      !!payload.entropy,
      ', events:',
      events.length,
      ')'
    );

    let rtoInfo: { rtoId: string; webhookKey: string | null } | null = null;

    if (isValidationRequest) {
      // For validation requests, tenant ID may not be present
      // We need to validate the signature against all RTOs with webhook keys
      if (!signature) {
        return NextResponse.json(
          { error: 'Missing x-xero-signature header' },
          { status: 400 }
        );
      }

      // Try to find RTO by validating signature
      const foundRto = await findRtoByWebhookSignature(bodyText, signature);
      if (foundRto) {
        rtoInfo = foundRto;
        console.log(
          'Validation request: Valid signature found for RTO',
          foundRto.rtoId
        );
        // Return 200 OK for valid validation request
        return NextResponse.json({ ok: true }, { status: 200 });
      } else {
        // Invalid signature for validation request
        console.error('Validation request: Invalid signature');
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    } else {
      // Regular webhook event - try to get tenant ID from header or event payload
      let effectiveTenantId = tenantId;

      // If tenant ID not in header, try to extract from first event
      if (!effectiveTenantId && events.length > 0) {
        const firstEvent = events[0] as XeroWebhookEvent & {
          tenantId?: string;
        };
        effectiveTenantId = firstEvent.tenantId ?? null; // Convert undefined to null
        console.log(
          'Extracted tenantId from event payload:',
          effectiveTenantId
        );
      }

      if (!effectiveTenantId) {
        console.error(
          'Regular webhook: Missing xero-tenant-id in header and event payload'
        );
        return NextResponse.json(
          {
            error:
              'Missing xero-tenant-id header and not found in event payload',
          },
          { status: 400 }
        );
      }

      // Find RTO by tenant ID (effectiveTenantId is guaranteed to be string here)
      rtoInfo = await findRtoByTenantId(effectiveTenantId as string);
      if (!rtoInfo) {
        console.error(`RTO not found for tenant ID: ${effectiveTenantId}`);
        return NextResponse.json(
          { error: 'RTO not found for this Xero organization' },
          { status: 404 }
        );
      }

      const { webhookKey } = rtoInfo;

      // Validate webhook signature
      if (signature && webhookKey) {
        const isValid = validateXeroWebhookSignature(
          bodyText,
          signature,
          webhookKey
        );
        if (!isValid) {
          console.error('Invalid Xero webhook signature');
          return NextResponse.json(
            { error: 'Invalid webhook signature' },
            { status: 401 }
          );
        }
      } else if (signature && !webhookKey) {
        // Webhook key not configured, log warning but allow in development
        console.warn(
          'Webhook signature provided but webhook key not configured in database. Skipping validation.'
        );
        // In production, you might want to reject this
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Webhook key not configured' },
            { status: 500 }
          );
        }
      }
    }

    // If we get here and rtoInfo is null, something went wrong
    if (!rtoInfo) {
      return NextResponse.json(
        { error: 'Unable to determine RTO' },
        { status: 400 }
      );
    }

    const { rtoId } = rtoInfo;

    // Process events (only for non-validation requests)
    // events is already defined above (line 527), so we can use it directly
    if (events.length > 0) {
      console.log(
        `Processing ${events.length} webhook event(s) for RTO ${rtoId}`
      );

      // Process all events (don't await - process in parallel for better performance)
      const processPromises = events.map((event) =>
        processWebhookEvent(rtoId, event, payload).catch((error) => {
          console.error('Error processing event:', error, event);
          // Continue processing other events even if one fails
        })
      );

      await Promise.allSettled(processPromises);
    }

    // Always return 200 OK to acknowledge receipt (Xero expects this within 5 seconds)
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in Xero webhook handler:', error);
    // Still return 200 OK to prevent Xero from retrying
    // (we log errors but don't want infinite retries for bad data)
    return NextResponse.json({ ok: true, error: message }, { status: 200 });
  }
}
