import { createClient } from '@supabase/supabase-js';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoiceTemplate } from './InvoiceTemplate';
import { buildInvoiceData } from './buildInvoiceData';
import type { Database, Tables } from '@/database.types';

type Db = Database;

interface GenerateInvoicePdfParams {
  invoiceId: string;
  invoiceType: 'APPLICATION' | 'ENROLLMENT';
  supabaseUrl: string;
  serviceRoleKey: string;
}

type EnrollmentInvoiceWithRelations = Tables<'enrollment_invoices'> & {
  enrollments: {
    id: string;
    student_id: string;
    students?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      preferred_name: string | null;
      student_addresses?: Tables<'student_addresses'>[];
    };
  } | null;
  enrollment_invoice_lines?: Tables<'enrollment_invoice_lines'>[];
  rtos?: Tables<'rtos'>;
};

type ApplicationInvoiceWithRelations = Tables<'application_invoices'> & {
  applications?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    preferred_name: string | null;
    street_building_name: string | null;
    street_unit_details: string | null;
    street_number: string | null;
    street_name: string | null;
    suburb: string | null;
    state: string | null;
    postcode: string | null;
  };
  application_invoice_lines?: Tables<'application_invoice_lines'>[];
  rtos?: Tables<'rtos'>;
};

type StudentData = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  preferred_name: string | null;
  student_addresses?: Tables<'student_addresses'>[];
};

/**
 * Next.js compatible version of the unified invoice PDF generator.
 * Fetches all required data from database and generates PDF bytes.
 */
export async function generateInvoicePdf({
  invoiceId,
  invoiceType,
  supabaseUrl,
  serviceRoleKey,
}: GenerateInvoicePdfParams): Promise<Uint8Array> {
  const supabase = createClient<Db>(supabaseUrl, serviceRoleKey);

  let invoice: EnrollmentInvoiceWithRelations | ApplicationInvoiceWithRelations;
  let invoiceLines:
    | Tables<'enrollment_invoice_lines'>[]
    | Tables<'application_invoice_lines'>[];
  let student: StudentData | null = null;
  let studentAddresses: Tables<'student_addresses'>[] = [];
  let rto: Tables<'rtos'> | null = null;

  if (invoiceType === 'ENROLLMENT') {
    // Fetch enrollment invoice data
    const { data: enrInvoice, error: invErr } = await supabase
      .from('enrollment_invoices')
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
        enrollment_invoice_lines (*),
        rtos:rto_id (*)
      `
      )
      .eq('id', invoiceId)
      .single();

    if (invErr || !enrInvoice) {
      throw new Error(
        `Enrollment invoice not found: ${invErr?.message || 'Unknown error'}`
      );
    }

    invoice = enrInvoice as EnrollmentInvoiceWithRelations;
    const enrollment = invoice.enrollments;
    student = enrollment?.students ?? null;
    rto = invoice.rtos ?? null;
    invoiceLines = invoice.enrollment_invoice_lines ?? [];
    studentAddresses = student?.student_addresses ?? [];
  } else {
    // Fetch application invoice data
    const { data: appInvoice, error: invErr } = await supabase
      .from('application_invoices')
      .select(
        `
        *,
        applications:application_id (
          id,
          first_name,
          last_name,
          email,
          preferred_name,
          street_building_name,
          street_unit_details,
          street_number,
          street_name,
          suburb,
          state,
          postcode
        ),
        application_invoice_lines (*),
        rtos:rto_id (*)
      `
      )
      .eq('id', invoiceId)
      .single();

    if (invErr || !appInvoice) {
      throw new Error(
        `Application invoice not found: ${invErr?.message || 'Unknown error'}`
      );
    }

    invoice = appInvoice as ApplicationInvoiceWithRelations;
    const application = invoice.applications;

    // Create student-like object from application data
    if (application) {
      student = {
        id: '',
        first_name: application.first_name,
        last_name: application.last_name,
        email: application.email,
        preferred_name: application.preferred_name,
      };

      // Build address from application fields
      if (
        application.suburb ||
        application.state ||
        application.postcode ||
        application.street_number ||
        application.street_name
      ) {
        studentAddresses = [
          {
            id: '',
            building_name: application.street_building_name,
            unit_details: application.street_unit_details,
            number: application.street_number,
            street: application.street_name,
            suburb: application.suburb,
            state: application.state,
            postcode: application.postcode,
            is_primary: true,
          } as Tables<'student_addresses'>,
        ];
      }
    }

    rto = invoice.rtos ?? null;
    invoiceLines = invoice.application_invoice_lines ?? [];
  }

  if (!student) {
    throw new Error('Student/application data not found for invoice');
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
  const enrollmentData =
    invoiceType === 'ENROLLMENT' &&
    'enrollments' in invoice &&
    invoice.enrollments
      ? {
          id: invoice.enrollments.id,
          student_id: invoice.enrollments.student_id,
        }
      : null;

  // Create invoice object compatible with buildInvoiceData
  const invoiceForBuild = {
    ...invoice,
    enrollments: enrollmentData,
    students: {
      id: student.id || '',
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
    },
    rtos: { ...rto, profile_image_path: rtoLogoUrl } as Tables<'rtos'>,
    invoice_lines: invoiceLines,
    enrollment_invoice_lines:
      invoiceType === 'ENROLLMENT' ? invoiceLines : undefined,
    application_invoice_lines:
      invoiceType === 'APPLICATION' ? invoiceLines : undefined,
    student_addresses: studentAddresses,
  } as Parameters<typeof buildInvoiceData>[0]['invoice'];

  const pdfData = buildInvoiceData({
    invoice: invoiceForBuild,
  });

  // Generate PDF using professional template
  const pdfBuffer = await renderToBuffer(<InvoiceTemplate data={pdfData} />);

  return new Uint8Array(pdfBuffer);
}
