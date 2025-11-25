import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoiceTemplate } from '@/lib/pdf/InvoiceTemplate';
import { buildInvoiceData } from '@/lib/pdf/buildInvoiceData';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { Tables } from '@/database.types';

export const runtime = 'nodejs';

/**
 * Generate invoice PDF on-demand.
 * If PDF already exists in storage, returns signed URL.
 * Otherwise, generates PDF, uploads to storage, and returns download URL.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'Invoice ID is required' }), {
        status: 400,
      });
    }

    const supabase = await createServerSupabase();

    // Fetch invoice with related data including invoice_lines, student_addresses, and full RTO data
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select(
        `*,
         enrollments:enrollment_id (
           student_id,
           students:student_id (
             id,
             first_name,
             last_name,
             email,
             student_addresses (*)
           )
         ),
         invoice_lines (*),
         rtos:rto_id (*)`
      )
      .eq('id', invoiceId)
      .single();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
      });
    }

    // Check if PDF already exists
    if (invoice.pdf_path) {
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: signed, error: signErr } = await admin.storage
        .from('invoices')
        .createSignedUrl(invoice.pdf_path, 60 * 5); // 5 minutes expiry (same as offer letter)
      if (!signErr && signed?.signedUrl) {
        return new Response(
          JSON.stringify({
            filePath: invoice.pdf_path,
            signedUrl: signed.signedUrl,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    // Generate PDF
    const enrollment = invoice.enrollments as unknown as {
      student_id: string;
      students?: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        student_addresses?: Array<{
          id: string;
          building_name: string | null;
          unit_details: string | null;
          number_name: string | null;
          suburb: string | null;
          state: string | null;
          postcode: string | null;
          is_primary: boolean;
        }>;
      } | null;
    } | null;

    const rto = invoice.rtos as unknown as Tables<'rtos'> | null;
    const student = enrollment?.students ?? null;
    const invoiceLines =
      (invoice.invoice_lines as unknown as Tables<'invoice_lines'>[]) ?? [];
    const studentAddresses =
      (student?.student_addresses as unknown as Tables<'student_addresses'>[]) ??
      [];

    // Generate signed URL for RTO logo if it exists
    let rtoLogoUrl: string | null = null;
    if (rto?.profile_image_path) {
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: signedLogo, error: logoErr } = await admin.storage
        .from('rto-assets')
        .createSignedUrl(rto.profile_image_path, 3600); // 1 hour expiry for PDF generation
      if (!logoErr && signedLogo?.signedUrl) {
        rtoLogoUrl = signedLogo.signedUrl;
      }
    }

    // Create RTO object with logo URL
    const rtoWithLogo = rto
      ? {
          ...rto,
          profile_image_path: rtoLogoUrl,
        }
      : null;

    const pdfData = buildInvoiceData({
      invoice: {
        ...invoice,
        enrollments: enrollment
          ? {
              id: invoice.enrollment_id as string,
              student_id: enrollment.student_id,
            }
          : null,
        students:
          student && student.first_name && student.last_name && student.email
            ? {
                id: student.id,
                first_name: student.first_name,
                last_name: student.last_name,
                email: student.email,
              }
            : null,
        rtos: rtoWithLogo,
        invoice_lines: invoiceLines,
        student_addresses: studentAddresses,
      },
    });

    const pdfBuffer = await renderToBuffer(<InvoiceTemplate data={pdfData} />);

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upload to storage (same path format as daily-finance-tick)
    const year = new Date(invoice.due_date as string).getFullYear();
    const filePath = `${invoice.rto_id}/${year}/${invoice.invoice_number}.pdf`;

    const { error: uploadErr } = await admin.storage
      .from('invoices')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) {
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadErr.message}` }),
        { status: 500 }
      );
    }

    // Update invoice record with pdf_path
    const { error: updateErr } = await admin
      .from('invoices')
      .update({ pdf_path: filePath })
      .eq('id', invoiceId);

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: `DB update failed: ${updateErr.message}` }),
        { status: 500 }
      );
    }

    // Return signed URL for download
    const { data: signed, error: signErr } = await admin.storage
      .from('invoices')
      .createSignedUrl(filePath, 60 * 5); // 5 minutes expiry (same as offer letter)

    if (signErr) {
      return new Response(
        JSON.stringify({ error: `Sign URL failed: ${signErr.message}` }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ filePath, signedUrl: signed?.signedUrl }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
