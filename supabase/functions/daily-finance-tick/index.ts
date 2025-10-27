/// <reference lib="deno.ns" />

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../_shared/database.types.ts';
import { renderToBuffer } from 'https://esm.sh/@react-pdf/renderer@3.4.3?target=deno&external=react';
import { createElement } from 'https://esm.sh/react@18.2.0';

// Lazy import invoice template & builder implemented in app lib; for Deno we provide a minimal inline version later
// Placeholder interfaces to avoid type drift; data building will query DB directly here.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function formatCurrencyAud(cents: number): string {
  const dollars = (cents ?? 0) / 100;
  return dollars.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
  });
}

function yyyy(date: Date) {
  return String(date.getFullYear());
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1) Promote SCHEDULED -> SENT for next 7 days window
    const { error: promoteErr } = await supabase.rpc(
      'promote_scheduled_invoices'
    );
    if (promoteErr) {
      console.warn('promote_scheduled_invoices failed', promoteErr.message);
    }

    // 2) Fetch invoices due today missing pdf_path
    const todayIso = new Date().toISOString().slice(0, 10);
    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select(
        'id, rto_id, enrollment_id, invoice_number, issue_date, due_date, amount_due_cents, amount_paid_cents, pdf_path'
      )
      .eq('due_date', todayIso)
      .is('pdf_path', null);
    if (invErr) {
      return new Response(JSON.stringify({ error: invErr.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Gather context for each invoice (student + rto minimal)
    const prepared: Array<{
      id: string;
      rto_id: string;
      invoice_number: string;
      due_date: string;
      issue_date: string;
      amount_due_cents: number;
      student_name: string;
      student_email: string | null;
      rto_name: string | null;
    }> = [];

    for (const inv of invoices ?? []) {
      // Enrollment -> Student, Application -> email/name
      const { data: enrol, error: enrolErr } = await supabase
        .from('enrollments')
        .select('id, student_id, rto_id, program_id')
        .eq('id', inv.enrollment_id)
        .single();
      if (enrolErr || !enrol) continue;

      const { data: student, error: stuErr } = await supabase
        .from('students')
        .select('id, first_name, last_name, email')
        .eq('id', enrol.student_id)
        .single();
      if (stuErr || !student) continue;

      const { data: rto, error: rtoErr } = await supabase
        .from('rtos')
        .select('id, name')
        .eq('id', inv.rto_id)
        .single();
      if (rtoErr) continue;

      prepared.push({
        id: inv.id as unknown as string,
        rto_id: inv.rto_id as unknown as string,
        invoice_number: String(inv.invoice_number),
        due_date: inv.due_date as unknown as string,
        issue_date: inv.issue_date as unknown as string,
        amount_due_cents: inv.amount_due_cents ?? 0,
        student_name: [student.first_name, student.last_name]
          .filter(Boolean)
          .join(' '),
        student_email: student.email,
        rto_name: rto?.name ?? null,
      });
    }

    // 3) Generate PDF per prepared invoice and upload
    for (const p of prepared) {
      // Minimal single-page invoice PDF (inline template)
      const { Document, Page, Text, View, StyleSheet } = await import(
        'https://esm.sh/@react-pdf/renderer@3.4.3?target=deno&external=react'
      );
      const styles = StyleSheet.create({
        page: {
          paddingTop: 40,
          paddingBottom: 40,
          paddingHorizontal: 42,
          fontSize: 11,
        },
        h1: { fontSize: 18, marginBottom: 8 },
        row: { marginTop: 6 },
        right: { textAlign: 'right' },
      });

      const InvoiceDoc = ({ data }: { data: typeof p }) => {
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
              createElement(Text, {}, data.invoice_number)
            ),
            createElement(
              View,
              { style: styles.row },
              createElement(Text, {}, `Issued: ${data.issue_date}`),
              createElement(Text, {}, `Due: ${data.due_date}`)
            ),
            createElement(
              View,
              { style: styles.row },
              createElement(Text, {}, `Bill To: ${data.student_name}`)
            ),
            createElement(
              View,
              { style: { marginTop: 16 } },
              createElement(
                Text,
                {},
                `Amount Due: ${formatCurrencyAud(data.amount_due_cents)}`
              )
            )
          )
        );
      };

      const element = createElement(InvoiceDoc, { data: p });
      const pdfBuffer = await renderToBuffer(element);
      const bytes = new Uint8Array(pdfBuffer);

      const year = yyyy(new Date(p.due_date as unknown as string));
      const filePath = `${p.rto_id}/${year}/${p.invoice_number}.pdf`;

      const { error: uploadErr } = await supabase.storage
        .from('invoices')
        .upload(filePath, bytes, {
          contentType: 'application/pdf',
          upsert: true,
        });
      if (uploadErr) {
        console.warn('upload failed', uploadErr.message);
        continue;
      }

      await supabase
        .from('invoices')
        .update({ pdf_path: filePath })
        .eq('id', p.id);
    }

    // 4) Email invoices due today if not recently sent
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const resendFrom = Deno.env.get('RESEND_FROM');
    if (resendKey) {
      for (const p of prepared) {
        if (!p.student_email) continue;
        // Fetch signed URL for attachment
        const { data: signed, error: signErr } = await supabase.storage
          .from('invoices')
          .createSignedUrl(
            `${p.rto_id}/${yyyy(new Date(p.due_date))}/${p.invoice_number}.pdf`,
            60 * 30
          );
        if (signErr || !signed?.signedUrl) continue;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFrom ?? 'no-reply@example.com',
            to: p.student_email,
            subject: `Invoice ${p.invoice_number} due ${p.due_date}`,
            html: `<p>Dear ${p.student_name},</p><p>Your invoice ${p.invoice_number} is due today.</p><p>Amount: ${formatCurrencyAud(p.amount_due_cents)}</p><p><a href="${signed.signedUrl}">Download PDF</a></p>`,
          }),
        });
        if (res.ok) {
          await supabase
            .from('invoices')
            .update({ last_email_sent_at: new Date().toISOString() })
            .eq('id', p.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed: prepared.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
