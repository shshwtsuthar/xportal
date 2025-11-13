import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoiceTemplate } from '@/lib/pdf/InvoiceTemplate';
import { buildInvoiceData } from '@/lib/pdf/buildInvoiceData';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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

    // Fetch invoice with related data
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
             email
           )
         ),
         rtos:rto_id (
           id,
           name,
           address_line_1,
           suburb,
           state,
           postcode
         )`
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
      } | null;
    } | null;

    const rto = invoice.rtos as unknown as {
      id: string;
      name: string | null;
      address_line_1: string | null;
      suburb: string | null;
      state: string | null;
      postcode: string | null;
    } | null;

    const student = enrollment?.students ?? null;

    const pdfData = buildInvoiceData({
      invoice: {
        ...invoice,
        enrollments: enrollment
          ? {
              id: invoice.enrollment_id as string,
              student_id: enrollment.student_id,
              rto_id: invoice.rto_id as string,
            }
          : null,
        students:
          student && student.email && student.first_name && student.last_name
            ? {
                id: student.id,
                first_name: student.first_name,
                last_name: student.last_name,
                email: student.email,
              }
            : null,
        rtos:
          rto && rto.name
            ? {
                id: rto.id,
                name: rto.name,
                address_line_1: rto.address_line_1 ?? null,
                suburb: rto.suburb ?? null,
                state: rto.state ?? null,
                postcode: rto.postcode ?? null,
              }
            : null,
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
