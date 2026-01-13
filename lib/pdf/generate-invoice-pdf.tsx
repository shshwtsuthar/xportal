import { createClient } from '@supabase/supabase-js';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoiceTemplate } from './InvoiceTemplate';
import { buildInvoiceData } from './buildInvoiceData';
import type { Database, Tables } from '@/database.types';

type Db = Database;

interface GenerateInvoicePdfParams {
  invoiceId: string;
  supabaseUrl: string;
  serviceRoleKey: string;
}

/**
 * Next.js compatible version of the unified invoice PDF generator.
 * Fetches all required data from database and generates PDF bytes.
 */
export async function generateInvoicePdf({
  invoiceId,
  supabaseUrl,
  serviceRoleKey,
}: GenerateInvoicePdfParams): Promise<Uint8Array> {
  const supabase = createClient<Db>(supabaseUrl, serviceRoleKey);

  // Fetch comprehensive invoice data
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select(
      `
      *,
      enrollments:enrollment_id (
        id,
        student_id,
        students:student_id (
          id,
          first_name,
          last_name,
          email,
          preferred_name,
          student_addresses (*)
        )
      ),
      invoice_lines (*),
      rtos:rto_id (*)
    `
    )
    .eq('id', invoiceId)
    .single();

  if (invErr || !invoice) {
    throw new Error(`Invoice not found: ${invErr?.message || 'Unknown error'}`);
  }

  // Extract and validate related data
  const enrollment = invoice.enrollments as unknown as {
    id: string;
    student_id: string;
    students?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      preferred_name: string | null;
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
    };
  } | null;

  const student = enrollment?.students ?? null;
  const rto = invoice.rtos as unknown as {
    id: string;
    name: string | null;
    address_line_1: string | null;
    suburb: string | null;
    state: string | null;
    postcode: string | null;
    rto_code: string | null;
    cricos_code: string | null;
    email_address: string | null;
    phone_number: string | null;
    profile_image_path: string | null;
    bank_name: string | null;
    bank_account_name: string | null;
    bank_bsb: string | null;
    bank_account_number: string | null;
  } | null;

  const invoiceLines =
    (invoice.invoice_lines as unknown as Tables<'invoice_lines'>[]) ?? [];

  if (!student) {
    throw new Error('Student not found for invoice');
  }

  if (!student.first_name || !student.last_name || !student.email) {
    throw new Error('Student data incomplete - missing required fields');
  }

  if (!rto) {
    throw new Error('RTO not found for invoice');
  }

  // Generate signed URL for RTO logo if it exists
  let rtoLogoUrl: string | null = null;
  if (rto.profile_image_path) {
    const { data: signedLogo, error: logoErr } = await supabase.storage
      .from('rto-assets')
      .createSignedUrl(rto.profile_image_path, 3600); // 1 hour expiry for PDF generation

    if (!logoErr && signedLogo?.signedUrl) {
      rtoLogoUrl = signedLogo.signedUrl;
    }
  }

  // Build PDF data using the existing buildInvoiceData function
  const pdfData = buildInvoiceData({
    invoice: {
      ...invoice,
      enrollments: enrollment
        ? { id: enrollment.id, student_id: enrollment.student_id }
        : null,
      students: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
      },
      rtos: { ...rto, profile_image_path: rtoLogoUrl } as Tables<'rtos'>,
      invoice_lines: invoiceLines,
      student_addresses:
        (student.student_addresses as Tables<'student_addresses'>[]) ?? [],
    },
  });

  // Generate PDF using professional template
  const pdfBuffer = await renderToBuffer(<InvoiceTemplate data={pdfData} />);

  return new Uint8Array(pdfBuffer);
}
