/// <reference lib="deno.ns" />

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../_shared/database.types.ts';

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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
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
  let invQuery = supabase
    .from('invoices')
    .select(
      'id, rto_id, enrollment_id, invoice_number, issue_date, due_date, amount_due_cents, pdf_generation_status, pdf_generation_attempts, pdf_path, status'
    )
    .eq('status', 'SCHEDULED')
    .lte('issue_date', todayIso)
    .is('pdf_path', null)
    .in('pdf_generation_status', ['pending', 'failed'] as const)
    .lt('pdf_generation_attempts', attemptCap);

  if (invoiceIds && invoiceIds.length > 0) {
    invQuery = invQuery.in('id', invoiceIds);
  }
  if (rtoFilter) {
    invQuery = invQuery.eq('rto_id', rtoFilter);
  }

  const { data: invoices, error: invErr } = await invQuery.limit(200);
  if (invErr) {
    return new Response(JSON.stringify({ error: invErr.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  const results: Array<{ id: string; status: string; message?: string }> = [];

  const claimInvoice = async (inv: InvoiceRow) => {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        pdf_generation_attempts: (inv.pdf_generation_attempts ?? 0) + 1,
        pdf_generation_status: 'pending',
        last_pdf_error: null,
      })
      .eq('id', inv.id)
      .eq('status', 'SCHEDULED')
      .lte('issue_date', todayIso)
      .is('pdf_path', null)
      .in('pdf_generation_status', ['pending', 'failed'] as const)
      .lt('pdf_generation_attempts', attemptCap)
      .select(
        'id, rto_id, enrollment_id, invoice_number, issue_date, due_date, amount_due_cents'
      )
      .single();

    if (error || !data) {
      return null;
    }
    return data;
  };

  for (const inv of invoices ?? []) {
    const claimed = await claimInvoice(inv as InvoiceRow);
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

      const { data: rto } = await supabase
        .from('rtos')
        .select('name')
        .eq('id', claimed.rto_id)
        .single();

      const { data: lines } = await supabase
        .from('invoice_lines')
        .select(
          'name, description, amount_cents, sequence_order, xero_account_code, xero_tax_type'
        )
        .eq('invoice_id', claimed.id)
        .order('sequence_order', { ascending: true });

      const lineItems = lines ?? [];
      const studentName =
        student.preferred_name ||
        [student.first_name, student.last_name].filter(Boolean).join(' ') ||
        'Student';
      const studentEmail = student.email ?? null;
      const rtoName = rto?.name ?? null;

      // Load react-pdf
      const reactPdf = await import(
        // deno-lint-ignore no-import-prefix
        'https://esm.sh/@react-pdf/renderer@3.4.3?target=deno'
      );
      const react = await import(
        // deno-lint-ignore no-import-prefix
        'https://esm.sh/react@18.2.0?target=deno'
      );

      const { Document, Page, Text, View, StyleSheet, renderToBuffer } =
        reactPdf;
      const { createElement } = react;

      const styles = StyleSheet.create({
        page: {
          paddingTop: 40,
          paddingBottom: 40,
          paddingHorizontal: 42,
          fontSize: 11,
        },
        h1: { fontSize: 18, marginBottom: 8 },
        row: { marginTop: 6, display: 'flex', flexDirection: 'row' },
        right: { textAlign: 'right' },
        tableHeader: { marginTop: 16, fontSize: 12, fontWeight: 700 },
        tableRow: {
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 4,
        },
      });

      const InvoiceDoc = ({
        data,
      }: {
        data: {
          invoice_number: string;
          issue_date: string;
          due_date: string;
          student_name: string;
          rto_name: string | null;
          amount_due_cents: number;
          lines: typeof lineItems;
        };
      }) => {
        return createElement(
          Document,
          { title: `Invoice ${data.invoice_number}` },
          createElement(
            Page,
            { size: 'A4', style: styles.page },
            createElement(
              View,
              {},
              createElement(Text, { style: styles.h1 }, 'Tax Invoice'),
              createElement(
                Text,
                {},
                `${data.rto_name ?? 'Training Organisation'}`
              ),
              createElement(Text, {}, `Invoice: ${data.invoice_number}`)
            ),
            createElement(
              View,
              { style: styles.row },
              createElement(Text, {}, `Issued: ${data.issue_date}`),
              createElement(
                Text,
                { style: styles.right },
                `Due: ${data.due_date}`
              )
            ),
            createElement(
              View,
              { style: styles.row },
              createElement(Text, {}, `Bill To: ${data.student_name}`)
            ),
            createElement(
              View,
              {},
              createElement(Text, { style: styles.tableHeader }, 'Line items'),
              ...data.lines.map((line) =>
                createElement(
                  View,
                  {
                    style: styles.tableRow,
                    key: `${line.sequence_order}-${line.name}`,
                  },
                  createElement(
                    Text,
                    {},
                    line.name +
                      (line.description ? ` — ${line.description}` : '')
                  ),
                  createElement(
                    Text,
                    { style: styles.right },
                    formatCurrencyAud(line.amount_cents ?? 0)
                  )
                )
              )
            ),
            createElement(
              View,
              { style: { marginTop: 16 } },
              createElement(
                Text,
                { style: { fontWeight: 700 } },
                `Amount Due: ${formatCurrencyAud(data.amount_due_cents)}`
              )
            )
          )
        );
      };

      const element = createElement(InvoiceDoc, {
        data: {
          invoice_number: String(claimed.invoice_number),
          issue_date: claimed.issue_date as string,
          due_date: claimed.due_date as string,
          student_name: studentName,
          rto_name: rtoName,
          amount_due_cents: claimed.amount_due_cents ?? 0,
          lines: lineItems,
        },
      });
      const pdfBuffer = await renderToBuffer(element);
      const bytes = new Uint8Array(pdfBuffer);

      const year = yyyy(claimed.due_date as string);
      const filePath = `${claimed.rto_id}/${year}/${claimed.invoice_number}.pdf`;

      const { error: uploadErr } = await supabase.storage
        .from('invoices')
        .upload(filePath, bytes, {
          contentType: 'application/pdf',
          upsert: true,
        });
      if (uploadErr) {
        throw new Error(`PDF upload failed: ${uploadErr.message}`);
      }

      const nowIso = new Date().toISOString();
      let emailSent = false;
      const resendKey = Deno.env.get('RESEND_API_KEY');
      const resendFrom = Deno.env.get('RESEND_FROM');

      if (resendKey && studentEmail) {
        const { data: signed, error: signErr } = await supabase.storage
          .from('invoices')
          .createSignedUrl(filePath, 60 * 30);

        if (!signErr && signed?.signedUrl) {
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
              html: `<p>Dear ${studentName},</p><p>Your invoice ${claimed.invoice_number} has been issued.</p><p>Amount: ${formatCurrencyAud(claimed.amount_due_cents ?? 0)}</p><p>Due Date: ${claimed.due_date}</p><p><a href="${signed.signedUrl}">Download PDF</a></p>`,
            }),
          });
          emailSent = emailRes.ok;
          if (!emailRes.ok) {
            console.warn(
              `Email send failed for invoice ${claimed.invoice_number}: ${await emailRes.text()}`
            );
          }
        }
      } else if (!resendKey) {
        // If Resend is not configured, still mark as sent after PDF generation
        emailSent = true;
      }

      await supabase
        .from('invoices')
        .update({
          pdf_path: filePath,
          pdf_generated_at: nowIso,
          pdf_generation_status: 'succeeded',
          last_pdf_error: null,
          status: emailSent ? 'SENT' : 'SCHEDULED',
          last_email_sent_at: emailSent ? nowIso : null,
        })
        .eq('id', claimed.id);

      results.push({ id: claimed.id, status: 'succeeded' });
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

  return new Response(
    JSON.stringify({
      processed: results.length,
      results,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
});
