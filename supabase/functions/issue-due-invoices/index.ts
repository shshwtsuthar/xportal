/// <reference lib="deno.ns" />

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../_shared/database.types.ts';
import { generateInvoicePdf } from '../_shared/generate-invoice-pdf.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Db = Database;
type InvoiceRow = Db['public']['Tables']['invoices']['Row'];

function formatCurrencyAud(cents: number): string {
  const dollars = (cents ?? 0) / 100;
  return dollars.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
  });
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function yyyy(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return String(d.getFullYear());
}

function isServiceAuthorized(req: Request, serviceKey: string | null): boolean {
  if (!serviceKey) return false;
  const authHeader = req.headers.get('Authorization') || '';
  return authHeader === `Bearer ${serviceKey}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_URL or SERVICE_ROLE_KEY missing' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }

  if (!isServiceAuthorized(req, serviceRoleKey)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const supabase = createClient<Db>(supabaseUrl, serviceRoleKey);
  const todayIso = new Date().toISOString().slice(0, 10);
  const attemptCap = 5;

  // Optional filters
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // no-op when no body
  }
  const invoiceIds = Array.isArray(body.invoiceIds)
    ? (body.invoiceIds as string[]).filter(Boolean)
    : undefined;
  const rtoFilter =
    typeof body.rtoId === 'string' && body.rtoId.length > 0
      ? (body.rtoId as string)
      : undefined;

  // Fetch candidate invoices
  const selectFields =
    'id, rto_id, enrollment_id, invoice_number, issue_date, due_date, amount_due_cents, pdf_generation_status, pdf_generation_attempts, pdf_path, status, last_email_sent_at, pdf_generated_at, last_pdf_error';

  // Generation candidates: no PDF yet
  let genQuery = supabase
    .from('invoices')
    .select(selectFields)
    .eq('status', 'SCHEDULED')
    .lte('issue_date', todayIso)
    .is('pdf_path', null)
    .in('pdf_generation_status', ['pending', 'failed'] as const)
    .lt('pdf_generation_attempts', attemptCap);

  // Resend candidates: PDF exists but no email sent yet (or too old), still SCHEDULED
  let resendQuery = supabase
    .from('invoices')
    .select(selectFields)
    .eq('status', 'SCHEDULED')
    .lte('issue_date', todayIso)
    .not('pdf_path', 'is', null)
    .is('last_email_sent_at', null)
    .eq('pdf_generation_status', 'succeeded')
    .lt('pdf_generation_attempts', attemptCap);

  if (invoiceIds && invoiceIds.length > 0) {
    genQuery = genQuery.in('id', invoiceIds);
    resendQuery = resendQuery.in('id', invoiceIds);
  }
  if (rtoFilter) {
    genQuery = genQuery.eq('rto_id', rtoFilter);
    resendQuery = resendQuery.eq('rto_id', rtoFilter);
  }

  const [
    { data: genInvoices, error: genErr },
    { data: resendInvoices, error: resendErr },
  ] = await Promise.all([genQuery.limit(200), resendQuery.limit(200)]);

  if (genErr || resendErr) {
    return new Response(
      JSON.stringify({
        error:
          genErr?.message || resendErr?.message || 'Failed to fetch invoices',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }

  const invoices = [...(genInvoices ?? []), ...(resendInvoices ?? [])];

  const results: Array<{ id: string; status: string; message?: string }> = [];
  type PdfStatus = Database['public']['Enums']['invoice_pdf_generation_status'];

  const claimInvoice = async (
    inv: InvoiceRow,
    mode: 'generate' | 'resend'
  ): Promise<
    | (InvoiceRow & {
        pdf_path?: string | null;
        last_email_sent_at?: string | null;
      })
    | null
  > => {
    const updatePayload =
      mode === 'generate'
        ? {
            pdf_generation_attempts: (inv.pdf_generation_attempts ?? 0) + 1,
            pdf_generation_status: 'pending' as PdfStatus,
            last_pdf_error: null,
          }
        : {
            pdf_generation_attempts: (inv.pdf_generation_attempts ?? 0) + 1,
            last_pdf_error: null,
          };

    const baseQuery = supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', inv.id)
      .eq('status', 'SCHEDULED')
      .lte('issue_date', todayIso)
      .lt('pdf_generation_attempts', attemptCap)
      .select('*');

    const claimFilters =
      mode === 'generate'
        ? baseQuery
            .is('pdf_path', null)
            .in('pdf_generation_status', ['pending', 'failed'] as const)
        : baseQuery
            .not('pdf_path', 'is', null)
            .eq('pdf_generation_status', 'succeeded')
            .is('last_email_sent_at', null);

    const { data, error } = await claimFilters.single();
    if (error || !data) {
      return null;
    }
    return data;
  };

  for (const inv of invoices ?? []) {
    const mode = inv.pdf_path ? 'resend' : 'generate';
    const claimed = await claimInvoice(inv as InvoiceRow, mode);
    if (!claimed) {
      results.push({
        id: String(inv.id),
        status: 'skipped',
        message: 'Already processed or locked by another worker',
      });
      continue;
    }

    try {
      // Fetch enrollment -> student
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('id', claimed.enrollment_id)
        .single();
      if (!enrollment) {
        throw new Error('Enrollment not found for invoice');
      }

      const { data: student } = await supabase
        .from('students')
        .select('first_name, last_name, email, preferred_name')
        .eq('id', enrollment.student_id)
        .single();
      if (!student) {
        throw new Error('Student not found for invoice');
      }

      const studentName =
        student.preferred_name ||
        [student.first_name, student.last_name].filter(Boolean).join(' ') ||
        'Student';
      const studentEmail = student.email ?? null;

      let filePath = claimed.pdf_path ?? null;
      let pdfGeneratedAt: string | null = null;
      let pdfBytes: Uint8Array | null = null;
      if (mode === 'generate') {
        // Use unified PDF generator
        pdfBytes = await generateInvoicePdf({
          invoiceId: claimed.id,
          supabaseUrl,
          serviceRoleKey,
        });

        const year = yyyy(claimed.due_date as string);
        filePath = `${claimed.rto_id}/${year}/${claimed.invoice_number}.pdf`;

        const { error: uploadErr } = await supabase.storage
          .from('invoices')
          .upload(filePath, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true,
          });
        if (uploadErr) {
          throw new Error(`PDF upload failed: ${uploadErr.message}`);
        }
        pdfGeneratedAt = new Date().toISOString();
      } else {
        filePath = claimed.pdf_path ?? null;
      }

      if (!pdfBytes && filePath) {
        const { data: downloaded, error: downloadErr } = await supabase.storage
          .from('invoices')
          .download(filePath);

        if (downloadErr || !downloaded) {
          throw new Error(
            `PDF download failed: ${downloadErr?.message || 'no data returned'}`
          );
        }
        const arrayBuffer = await downloaded.arrayBuffer();
        pdfBytes = new Uint8Array(arrayBuffer);
      }

      const nowIso = new Date().toISOString();
      let emailSent = false;
      const resendKey = Deno.env.get('RESEND_API_KEY');
      const resendFrom = Deno.env.get('RESEND_FROM');

      if (!resendKey) {
        console.warn(
          `Email not sent for invoice ${claimed.invoice_number}: RESEND_API_KEY not configured`
        );
      } else if (!studentEmail) {
        console.warn(
          `Email not sent for invoice ${claimed.invoice_number}: student email missing`
        );
      } else if (filePath) {
        const base64Pdf = pdfBytes ? toBase64(pdfBytes) : null;
        if (!base64Pdf) {
          console.warn(
            `Email not sent for invoice ${claimed.invoice_number}: PDF bytes unavailable`
          );
        } else {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: resendFrom ?? 'no-reply@example.com',
              to: studentEmail,
              subject: `Invoice ${claimed.invoice_number} - ${claimed.due_date}`,
              html: `<p>Dear ${studentName},</p><p>Your invoice ${claimed.invoice_number} has been issued.</p><p>Amount: ${formatCurrencyAud(
                claimed.amount_due_cents ?? 0
              )}</p><p>Due Date: ${claimed.due_date}</p><p>Your PDF invoice is attached.</p>`,
              attachments: [
                {
                  filename: `${claimed.invoice_number}.pdf`,
                  content: base64Pdf,
                  mimeType: 'application/pdf',
                },
              ],
            }),
          });
          emailSent = emailRes.ok;
          if (!emailRes.ok) {
            console.warn(
              `Email send failed for invoice ${claimed.invoice_number}: ${await emailRes.text()}`
            );
          }
        }
      }

      const pdfStatus: PdfStatus =
        mode === 'generate'
          ? ('succeeded' as PdfStatus)
          : ((claimed.pdf_generation_status as PdfStatus) ??
            ('succeeded' as PdfStatus));

      await supabase
        .from('invoices')
        .update({
          pdf_path: filePath,
          pdf_generated_at: pdfGeneratedAt ?? claimed.pdf_generated_at ?? null,
          pdf_generation_status: pdfStatus,
          last_pdf_error: emailSent ? null : claimed.last_pdf_error,
          status: emailSent ? 'SENT' : 'SCHEDULED',
          last_email_sent_at: emailSent ? nowIso : null,
        })
        .eq('id', claimed.id);

      results.push({
        id: claimed.id,
        status: emailSent ? 'succeeded' : 'email_pending',
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error generating PDF';
      console.error(`Invoice ${claimed.id} failed:`, message);

      await supabase
        .from('invoices')
        .update({
          pdf_generation_status: 'failed',
          last_pdf_error: message,
        })
        .eq('id', claimed.id);

      results.push({ id: claimed.id, status: 'failed', message });
    }
  }

  // Mark overdue invoices in bounded batches
  let overdueMarked = 0;
  const batchLimit = 500;
  while (true) {
    const { data: updatedCount, error: overdueErr } = await supabase.rpc(
      'mark_overdue_invoices_batch' as unknown as keyof Database['public']['Functions'],
      { p_limit: batchLimit } as never
    );

    if (overdueErr) {
      console.error('mark_overdue_invoices_batch failed:', overdueErr.message);
      break;
    }

    const count =
      typeof updatedCount === 'number'
        ? updatedCount
        : Number(updatedCount ?? 0);
    overdueMarked += count;
    if (count === 0) break;
  }

  return new Response(
    JSON.stringify({
      processed: results.length,
      results,
      overdue_marked: overdueMarked,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
});
