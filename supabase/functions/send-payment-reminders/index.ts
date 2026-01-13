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

  try {
    // Fetch all active reminders with related data
    const { data: reminders, error: remindersErr } = await supabase.from(
      'payment_plan_reminders'
    ).select(`
        *,
        payment_plan_templates:template_id (
          id
        ),
        mail_templates:mail_template_id (
          id,
          subject,
          html_body
        )
      `);

    if (remindersErr) {
      return new Response(JSON.stringify({ error: remindersErr.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const results: Array<{
      reminderId: string;
      reminderName: string;
      emailsSent: number;
      skipped: number;
    }> = [];

    // Process each reminder
    for (const reminder of reminders ?? []) {
      let emailsSent = 0;
      let skipped = 0;

      // Calculate trigger date for exact matching
      // Reminder triggers when: due_date + offset_days = today
      // Rearranging: due_date = today - offset_days
      // Example: If offset_days = -7 (7 days before), we want invoices where due_date = today + 7 days
      // Example: If offset_days = 3 (3 days after), we want invoices where due_date = today - 3 days
      // We use UTC dates to ensure consistent timezone handling
      const triggerOffset = -reminder.offset_days;
      const targetDate = new Date(todayIso);
      targetDate.setDate(targetDate.getDate() + triggerOffset);
      const targetDateStr = targetDate.toISOString().slice(0, 10);

      // Find all enrollments using this template, filtered by RTO to prevent cross-tenant sends
      const { data: enrollments, error: enrollErr } = await supabase
        .from('enrollments')
        .select('id')
        .eq('payment_plan_template_id', reminder.template_id)
        .eq('rto_id', reminder.rto_id);

      if (enrollErr || !enrollments || enrollments.length === 0) {
        continue;
      }

      const enrollmentIds = enrollments.map((e) => e.id);

      // Find invoices where:
      // - due_date matches target date
      // - status is SCHEDULED or SENT (not PAID or VOID)
      // - no reminder has been sent yet for this (invoice, reminder) pair
      const { data: invoices, error: invoicesErr } = await supabase
        .from('invoices')
        .select(
          `
          id,
          invoice_number,
          due_date,
          amount_due_cents,
          amount_paid_cents,
          pdf_path,
          enrollment_id,
          rto_id
        `
        )
        .in('enrollment_id', enrollmentIds)
        .eq('due_date', targetDateStr)
        .in('status', ['SCHEDULED', 'SENT'] as const);

      if (invoicesErr || !invoices || invoices.length === 0) {
        results.push({
          reminderId: reminder.id,
          reminderName: reminder.name,
          emailsSent: 0,
          skipped: 0,
        });
        continue;
      }

      // Filter out invoices that:
      // 1. Already have this reminder sent
      // 2. Are for deposit installments (check via application_payment_schedule)
      for (const invoice of invoices) {
        // Check if reminder already sent
        const { data: alreadySent } = await supabase
          .from('invoice_reminders_sent')
          .select('id')
          .eq('invoice_id', invoice.id)
          .eq('reminder_id', reminder.id)
          .maybeSingle();

        if (alreadySent) {
          skipped++;
          continue;
        }

        // Check if this invoice is for a deposit installment using optimized query
        // Get enrollment and student data in one query
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select(
            `
            student_id,
            students!inner(
              application_id,
              first_name,
              last_name,
              email,
              preferred_name
            )
          `
          )
          .eq('id', invoice.enrollment_id)
          .single();

        if (!enrollment) {
          skipped++;
          continue;
        }

        const student = enrollment.students as unknown as {
          application_id: string;
          first_name: string;
          last_name: string;
          email: string;
          preferred_name: string | null;
        } | null;

        if (!student || !student.application_id) {
          skipped++;
          continue;
        }

        // Query schedule entry with installment join to get is_deposit in one query
        const { data: scheduleEntry } = await supabase
          .from('application_payment_schedule')
          .select(
            `
            template_installment_id,
            payment_plan_template_installments!inner(
              is_deposit
            )
          `
          )
          .eq('application_id', student.application_id)
          .eq('due_date', invoice.due_date)
          .maybeSingle();

        if (!scheduleEntry) {
          skipped++;
          continue;
        }

        // Check if the installment is a deposit
        const installment =
          scheduleEntry.payment_plan_template_installments as unknown as {
            is_deposit: boolean;
          } | null;

        if (installment?.is_deposit) {
          // Skip deposit installments
          skipped++;
          continue;
        }

        // Skip if invoice is fully paid (even if status hasn't been updated)
        if (invoice.amount_paid_cents >= invoice.amount_due_cents) {
          skipped++;
          continue;
        }

        // Prepare email data
        const studentName =
          student.preferred_name ||
          [student.first_name, student.last_name].filter(Boolean).join(' ') ||
          'Student';
        const studentEmail = student.email;

        if (!studentEmail) {
          skipped++;
          continue;
        }

        const mailTemplate = reminder.mail_templates as unknown as {
          subject: string;
          html_body: string;
        } | null;

        if (!mailTemplate) {
          skipped++;
          continue;
        }

        // Handle PDF regeneration if requested
        let pdfBytes: Uint8Array | null = null;
        let pdfPath = invoice.pdf_path;

        if (reminder.regenerate_invoice) {
          // Regenerate PDF using same logic as issue-due-invoices
          const { data: rto } = await supabase
            .from('rtos')
            .select('name')
            .eq('id', invoice.rto_id)
            .single();

          const { data: lines } = await supabase
            .from('invoice_lines')
            .select('name, description, amount_cents, sequence_order')
            .eq('invoice_id', invoice.id)
            .order('sequence_order', { ascending: true });

          // Load react-pdf
          const reactPdf =
            await import('https://esm.sh/@react-pdf/renderer@3.4.3?target=deno');
          const react = await import('https://esm.sh/react@18.2.0?target=deno');

          const { Document, Page, Text, View, StyleSheet, renderToBuffer } =
            reactPdf as typeof import('https://esm.sh/@react-pdf/renderer@3.4.3?target=deno');
          const { createElement } =
            react as typeof import('https://esm.sh/react@18.2.0?target=deno');

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
              due_date: string;
              student_name: string;
              rto_name: string | null;
              amount_due_cents: number;
              lines: typeof lines;
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
                  createElement(Text, {}, `Due: ${data.due_date}`)
                ),
                createElement(
                  View,
                  { style: styles.row },
                  createElement(Text, {}, `Bill To: ${data.student_name}`)
                ),
                createElement(
                  View,
                  {},
                  createElement(
                    Text,
                    { style: styles.tableHeader },
                    'Line items'
                  ),
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
              invoice_number: invoice.invoice_number,
              due_date: invoice.due_date as string,
              student_name: studentName,
              rto_name: rto?.name ?? null,
              amount_due_cents: invoice.amount_due_cents ?? 0,
              lines: lines ?? [],
            },
          });

          const pdfBuffer = await renderToBuffer(
            element as Parameters<typeof renderToBuffer>[0]
          );
          pdfBytes = new Uint8Array(pdfBuffer);

          // Upload to storage
          const year = new Date(invoice.due_date as string).getFullYear();
          pdfPath = `${invoice.rto_id}/${year}/${invoice.invoice_number}.pdf`;

          const { error: uploadErr } = await supabase.storage
            .from('invoices')
            .upload(pdfPath, pdfBytes, {
              contentType: 'application/pdf',
              upsert: true,
            });

          if (uploadErr) {
            console.warn(
              `PDF upload failed for invoice ${invoice.id}:`,
              uploadErr.message
            );
            pdfBytes = null;
          } else {
            // Update invoice with new PDF path
            await supabase
              .from('invoices')
              .update({ pdf_path: pdfPath })
              .eq('id', invoice.id);
          }
        } else if (pdfPath) {
          // Download existing PDF
          const { data: downloaded, error: downloadErr } =
            await supabase.storage.from('invoices').download(pdfPath);

          if (!downloadErr && downloaded) {
            const arrayBuffer = await downloaded.arrayBuffer();
            pdfBytes = new Uint8Array(arrayBuffer);
          }
        }

        // Send email via Resend
        const resendKey = Deno.env.get('RESEND_API_KEY');
        const resendFrom = Deno.env.get('RESEND_FROM');

        if (!resendKey) {
          console.warn('RESEND_API_KEY not configured, skipping email');
          skipped++;
          continue;
        }

        // Replace placeholders in email template
        let emailSubject = mailTemplate.subject || 'Payment Reminder';
        let emailBody = mailTemplate.html_body || '<p>Payment reminder</p>';

        // Simple placeholder replacement
        emailSubject = emailSubject.replace(/{{student_name}}/g, studentName);
        emailSubject = emailSubject.replace(
          /{{invoice_number}}/g,
          invoice.invoice_number
        );
        emailSubject = emailSubject.replace(
          /{{amount_due}}/g,
          formatCurrencyAud(invoice.amount_due_cents ?? 0)
        );
        emailSubject = emailSubject.replace(
          /{{due_date}}/g,
          invoice.due_date as string
        );

        emailBody = emailBody.replace(/{{student_name}}/g, studentName);
        emailBody = emailBody.replace(
          /{{invoice_number}}/g,
          invoice.invoice_number
        );
        emailBody = emailBody.replace(
          /{{amount_due}}/g,
          formatCurrencyAud(invoice.amount_due_cents ?? 0)
        );
        emailBody = emailBody.replace(
          /{{due_date}}/g,
          invoice.due_date as string
        );

        const emailPayload: Record<string, unknown> = {
          from: resendFrom ?? 'no-reply@example.com',
          to: studentEmail,
          subject: emailSubject,
          html: emailBody,
        };

        // Add attachment if we have PDF
        if (pdfBytes && pdfPath) {
          emailPayload.attachments = [
            {
              filename: `${invoice.invoice_number}.pdf`,
              content: toBase64(pdfBytes),
              mimeType: 'application/pdf',
            },
          ];
        }

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });

        if (emailRes.ok) {
          // Mark reminder as sent (idempotent - ignore if already exists)
          const { error: insertErr } = await supabase
            .from('invoice_reminders_sent')
            .upsert(
              {
                invoice_id: invoice.id,
                reminder_id: reminder.id,
              },
              {
                onConflict: 'invoice_id,reminder_id',
                ignoreDuplicates: true,
              }
            );

          if (insertErr) {
            // If it's a duplicate, that's fine - count as sent
            // PostgreSQL unique violation error code is 23505
            if (
              insertErr.code === '23505' ||
              insertErr.message.includes('duplicate')
            ) {
              emailsSent++;
            } else {
              // Otherwise, log the error but don't fail the entire batch
              console.warn(
                `Failed to mark reminder as sent for invoice ${invoice.id}:`,
                insertErr.message
              );
              skipped++;
            }
          } else {
            emailsSent++;
          }
        } else {
          console.warn(
            `Email send failed for invoice ${invoice.id}:`,
            await emailRes.text()
          );
          skipped++;
        }
      }

      results.push({
        reminderId: reminder.id,
        reminderName: reminder.name,
        emailsSent,
        skipped,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('send-payment-reminders error:', message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
