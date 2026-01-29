/// <reference lib="deno.ns" />

import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types.ts';

// Import React for PDF rendering (ESM from esm.sh)
const reactPdf =
  await import('https://esm.sh/@react-pdf/renderer@3.4.3?target=deno');
const react = await import('https://esm.sh/react@18.2.0?target=deno');

const {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  renderToBuffer: renderToBufferFn,
} = reactPdf as typeof import('@react-pdf/renderer');
const { createElement } = react as typeof import('react');

type Db = Database;
type EnrollmentInvoiceRow =
  Db['public']['Tables']['enrollment_invoices']['Row'];
type ApplicationInvoiceRow =
  Db['public']['Tables']['application_invoices']['Row'];
type StudentRow = Db['public']['Tables']['students']['Row'];
type RTORow = Db['public']['Tables']['rtos']['Row'];
type EnrollmentInvoiceLineRow =
  Db['public']['Tables']['enrollment_invoice_lines']['Row'];
type ApplicationInvoiceLineRow =
  Db['public']['Tables']['application_invoice_lines']['Row'];
type StudentAddressRow = Db['public']['Tables']['student_addresses']['Row'];

interface GenerateInvoicePdfParams {
  invoiceId: string;
  invoiceType: 'APPLICATION' | 'ENROLLMENT';
  supabaseUrl: string;
  serviceRoleKey: string;
}

interface InvoicePdfData {
  rtoName: string;
  rtoAddress: string;
  rtoCode: string;
  cricosCode: string;
  rtoEmail: string;
  rtoPhone: string;
  rtoLogoUrl?: string | null;
  studentName: string;
  studentAddress?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  orderNo: string;
  datePaid: string;
  lines: Array<{ description: string; amountCents: number }>;
  totalAmountCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
  gstCents: number;
  bankDetails: {
    bankName: string;
    accountName: string;
    bsb: string;
    accountNo: string;
  };
}

/**
 * Unified invoice PDF generator using professional template.
 * Fetches all required data from database and generates PDF bytes.
 */
export async function generateInvoicePdf({
  invoiceId,
  invoiceType,
  supabaseUrl,
  serviceRoleKey,
}: GenerateInvoicePdfParams): Promise<Uint8Array> {
  const supabase = createClient<Db>(supabaseUrl, serviceRoleKey);

  let invoice: EnrollmentInvoiceRow | ApplicationInvoiceRow;
  let invoiceLines: EnrollmentInvoiceLineRow[] | ApplicationInvoiceLineRow[];
  let student: StudentRow | null = null;
  let studentAddresses: StudentAddressRow[] = [];
  let rto: RTORow | null = null;

  if (invoiceType === 'ENROLLMENT') {
    // Fetch enrollment invoice data
    const { data: enrInvoice, error: invErr } = await supabase
      .from('enrollment_invoices')
      .select(
        `
        *,
        enrollments:enrollment_id (
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
      } as StudentRow;

      // Build address from application fields
      const addressParts = [
        application.street_building_name,
        application.street_unit_details,
        [application.street_number, application.street_name]
          .filter(Boolean)
          .join(' '),
        application.suburb,
        application.state,
        application.postcode,
      ].filter(Boolean);

      if (addressParts.length > 0) {
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
          } as StudentAddressRow,
        ];
      }
    }

    rto = invoice.rtos ?? null;
    invoiceLines = invoice.application_invoice_lines ?? [];
  }

  if (!student) {
    throw new Error('Student/application data not found for invoice');
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

  // Build PDF data using the same logic as buildInvoiceData.ts
  const pdfData = buildInvoicePdfData({
    invoice:
      invoiceType === 'ENROLLMENT'
        ? (invoice as EnrollmentInvoiceWithRelations as EnrollmentInvoiceRow)
        : (invoice as ApplicationInvoiceWithRelations as ApplicationInvoiceRow),
    student,
    rto: { ...rto, profile_image_path: rtoLogoUrl },
    invoiceLines:
      invoiceType === 'ENROLLMENT'
        ? (invoiceLines as EnrollmentInvoiceLineRow[])
        : (invoiceLines as ApplicationInvoiceLineRow[]),
    studentAddresses,
  });

  // Generate PDF using professional template
  const pdfBuffer = await renderToBufferFn(
    createElement(InvoiceTemplate, { data: pdfData })
  );

  return new Uint8Array(pdfBuffer);
}

/**
 * Build invoice data structure for PDF generation
 */
function buildInvoicePdfData({
  invoice,
  student,
  rto,
  invoiceLines,
  studentAddresses,
}: {
  invoice: EnrollmentInvoiceRow | ApplicationInvoiceRow;
  student: StudentRow & { student_addresses?: StudentAddressRow[] };
  rto: RTORow & { profile_image_path?: string | null };
  invoiceLines: EnrollmentInvoiceLineRow[] | ApplicationInvoiceLineRow[];
  studentAddresses: StudentAddressRow[];
}): InvoicePdfData {
  // 1. Format student address (Primary -> First available -> Empty)
  const primaryAddress =
    studentAddresses.find((addr) => addr.is_primary) || studentAddresses[0];

  const formattedStudentAddress = primaryAddress
    ? [
        primaryAddress.building_name,
        primaryAddress.unit_details,
        [primaryAddress.number, primaryAddress.street]
          .filter(Boolean)
          .join(' '),
        primaryAddress.suburb,
        primaryAddress.state,
        primaryAddress.postcode,
      ]
        .filter(Boolean)
        .join(' ')
        .toUpperCase()
    : '';

  // 2. Format RTO address
  const rtoAddress = [rto.address_line_1, rto.suburb, rto.state, rto.postcode]
    .filter(Boolean)
    .join(', ');

  // 3. Calculate financials
  const totalAmountCents = invoiceLines.reduce(
    (acc, line) => acc + line.amount_cents,
    0
  );
  const amountPaidCents = invoice.amount_paid_cents ?? 0;
  const balanceDueCents = totalAmountCents - amountPaidCents;

  return {
    // RTO Details
    rtoName: rto.name ?? 'RTO Name',
    rtoAddress,
    rtoCode: rto.rto_code ?? '',
    cricosCode: rto.cricos_code ?? '',
    rtoEmail: rto.email_address ?? '',
    rtoPhone: rto.phone_number ?? '',
    rtoLogoUrl: rto.profile_image_path ?? null,

    // Student Details
    studentName: [student.preferred_name, student.first_name, student.last_name]
      .filter(Boolean)
      .join(' ')
      .toUpperCase(),
    studentAddress: formattedStudentAddress,

    // Invoice Meta
    invoiceNumber: invoice.invoice_number,
    issueDate: new Date(invoice.issue_date).toLocaleDateString('en-AU'),
    dueDate: new Date(invoice.due_date).toLocaleDateString('en-AU'),
    orderNo: '', // Not implemented yet
    datePaid:
      amountPaidCents >= totalAmountCents
        ? new Date().toLocaleDateString('en-AU')
        : '',

    // Line Items
    lines: invoiceLines
      .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
      .map((line) => ({
        description: line.description || line.name,
        amountCents: line.amount_cents,
      })),

    // Financial Totals
    totalAmountCents,
    amountPaidCents,
    balanceDueCents,
    gstCents: 0, // GST calculation not implemented yet

    // Bank Details
    bankDetails: {
      bankName: rto.bank_name ?? '',
      accountName: rto.bank_account_name ?? '',
      bsb: rto.bank_bsb ?? '',
      accountNo: rto.bank_account_number ?? '',
    },
  };
}

/**
 * Professional Invoice Template Component
 * Ported from lib/pdf/InvoiceTemplate.tsx for Deno compatibility
 */
function InvoiceTemplate({ data }: { data: InvoicePdfData }) {
  return createElement(
    Document,
    { title: `Invoice ${data.invoiceNumber}` },
    createElement(
      Page,
      { size: 'A4', style: styles.page },
      // HEADER
      createElement(
        View,
        { style: styles.header },
        createElement(
          View,
          { style: styles.headerLeft },
          data.rtoLogoUrl &&
            createElement(Image, {
              src: data.rtoLogoUrl,
              style: styles.logo,
            })
        ),
        createElement(
          View,
          { style: styles.headerRight },
          createElement(Text, { style: styles.rtoMetaText }, data.rtoAddress),
          createElement(
            Text,
            { style: styles.rtoMetaText },
            `RTO Code: ${data.rtoCode}`
          ),
          createElement(
            Text,
            { style: styles.rtoMetaText },
            `CRICOS Code: ${data.cricosCode}`
          ),
          createElement(Text, { style: styles.rtoMetaText }, data.rtoEmail),
          createElement(Text, { style: styles.rtoMetaText }, data.rtoPhone)
        )
      ),

      // INVOICE META
      createElement(
        View,
        { style: styles.metaContainer },
        createElement(
          View,
          { style: styles.metaLeft },
          createElement(Text, { style: styles.headingTitle }, 'Tax Invoice'),
          createElement(Text, { style: styles.recipientLabel }, 'Recipient'),
          createElement(
            Text,
            { style: { fontSize: 10, marginBottom: 2 } },
            data.studentName
          ),
          createElement(
            Text,
            { style: styles.recipientAddress },
            data.studentAddress
          ),
          createElement(Text, { style: styles.recipientAddress }, 'AUSTRALIA')
        ),

        createElement(
          View,
          { style: styles.metaRight },
          createElement(
            View,
            { style: styles.metaRow },
            createElement(Text, { style: styles.metaLabel }, 'Due Date:'),
            createElement(Text, { style: styles.metaValue }, data.dueDate)
          ),
          createElement(
            View,
            { style: styles.metaRow },
            createElement(Text, { style: styles.metaLabel }, 'Invoice No:'),
            createElement(Text, { style: styles.metaValue }, data.invoiceNumber)
          ),
          createElement(
            View,
            { style: styles.metaRow },
            createElement(Text, { style: styles.metaLabel }, 'Invoice Date:'),
            createElement(Text, { style: styles.metaValue }, data.issueDate)
          ),
          createElement(
            View,
            { style: styles.metaRow },
            createElement(Text, { style: styles.metaLabel }, 'Order No:'),
            createElement(Text, { style: styles.metaValue }, data.orderNo)
          ),
          createElement(
            View,
            { style: styles.metaRow },
            createElement(Text, { style: styles.metaLabel }, 'Date Paid:'),
            createElement(Text, { style: styles.metaValue }, data.datePaid)
          )
        )
      ),

      // TABLE
      createElement(
        View,
        { style: styles.table },
        createElement(
          View,
          { style: styles.tableHeader },
          createElement(
            Text,
            { style: [styles.colDesc, styles.headerText] },
            'Description'
          ),
          createElement(
            Text,
            { style: [styles.colAmount, styles.headerText] },
            'Amount (Ex GST)'
          ),
          createElement(
            Text,
            { style: [styles.colTotal, styles.headerText] },
            'Total Amount'
          )
        ),
        ...data.lines.map((line, i) =>
          createElement(
            View,
            { key: i, style: styles.tableRow },
            createElement(Text, { style: styles.colDesc }, line.description),
            createElement(
              Text,
              { style: styles.colAmount },
              formatCurrency(line.amountCents)
            ),
            createElement(
              Text,
              { style: styles.colTotal },
              formatCurrency(line.amountCents)
            )
          )
        )
      ),

      // TOTALS
      createElement(
        View,
        { style: styles.totalsContainer },
        createElement(
          View,
          { style: styles.totalsBox },
          createElement(
            View,
            { style: styles.totalRow },
            createElement(Text, { style: styles.totalLabel }, 'GST'),
            createElement(
              Text,
              { style: styles.totalValue },
              formatCurrency(data.gstCents)
            )
          ),
          createElement(
            View,
            { style: styles.totalRow },
            createElement(Text, { style: styles.totalLabel }, 'Total'),
            createElement(
              Text,
              { style: styles.totalValue },
              formatCurrency(data.totalAmountCents)
            )
          ),
          createElement(
            View,
            { style: styles.totalRow },
            createElement(Text, { style: styles.totalLabel }, 'Amount Paid'),
            createElement(
              Text,
              { style: styles.totalValue },
              formatCurrency(data.amountPaidCents)
            )
          ),
          createElement(
            View,
            { style: [styles.totalRow, styles.balanceRow] },
            createElement(
              Text,
              { style: [styles.totalLabel, { fontWeight: 'bold' }] },
              'Balance Due'
            ),
            createElement(
              Text,
              { style: [styles.totalValue, { fontWeight: 'bold' }] },
              formatCurrency(data.balanceDueCents)
            )
          )
        )
      ),

      // FOOTER & BANK
      createElement(
        View,
        { style: styles.footer },
        createElement(Text, { style: styles.sectionTitle }, 'Payment Methods'),
        createElement(
          Text,
          { style: styles.footerText },
          'This invoice is also a receipt when paid in full. Payment terms are strictly 7 days from the invoice date.'
        ),
        createElement(
          Text,
          { style: [styles.footerText, { marginBottom: 10 }] },
          'Please note: credit cards attract up to 2% surcharge.'
        ),

        createElement(
          Text,
          { style: styles.footerText },
          '1. Secure online payment via Credit Card'
        ),
        createElement(
          Text,
          { style: styles.footerText },
          '2. Direct Debit to the following Account:'
        ),

        createElement(
          View,
          { style: styles.bankDetailsBox },
          createElement(
            View,
            { style: styles.bankRow },
            createElement(Text, { style: styles.bankLabel }, 'Bank Name'),
            createElement(
              Text,
              { style: styles.bankValue },
              data.bankDetails.bankName
            )
          ),
          createElement(
            View,
            { style: styles.bankRow },
            createElement(Text, { style: styles.bankLabel }, 'Account Name'),
            createElement(
              Text,
              { style: styles.bankValue },
              data.bankDetails.accountName
            )
          ),
          createElement(
            View,
            { style: styles.bankRow },
            createElement(Text, { style: styles.bankLabel }, 'BSB'),
            createElement(
              Text,
              { style: styles.bankValue },
              data.bankDetails.bsb
            )
          ),
          createElement(
            View,
            { style: styles.bankRow },
            createElement(Text, { style: styles.bankLabel }, 'Account No'),
            createElement(
              Text,
              { style: styles.bankValue },
              data.bankDetails.accountNo
            )
          )
        )
      )
    )
  );
}

// Styles (copied from InvoiceTemplate.tsx)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333',
    lineHeight: 1.4,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  headerLeft: {
    width: '45%',
  },
  headerRight: {
    width: '50%',
    textAlign: 'right',
  },
  logo: {
    width: 150,
    height: 60,
    marginBottom: 10,
    objectFit: 'contain',
  },
  rtoMetaText: {
    fontSize: 9,
    marginBottom: 2,
    color: '#000',
  },

  // Invoice Info Grid
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  metaLeft: {
    width: '55%',
  },
  metaRight: {
    width: '35%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
  },
  headingTitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  recipientLabel: {
    fontSize: 9,
    marginBottom: 4,
  },
  recipientAddress: {
    fontSize: 10,
    color: '#555',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaLabel: {
    color: '#6b7280',
    fontSize: 9,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
  },

  // Table
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 8,
  },
  colDesc: { width: '60%', paddingRight: 10 },
  colAmount: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  headerText: { fontSize: 9, color: '#6b7280' },

  // Totals
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 30,
  },
  totalsBox: { width: '40%' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: { fontSize: 10 },
  totalValue: { fontSize: 10, textAlign: 'right' },
  balanceRow: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 4,
  },

  // Footer
  footer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
  },
  sectionTitle: { fontSize: 10, marginBottom: 8 },
  footerText: { fontSize: 9, marginBottom: 4, color: '#444' },
  bankDetailsBox: {
    marginTop: 10,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 4,
  },
  bankRow: { flexDirection: 'row', marginBottom: 2 },
  bankLabel: { width: 100, fontSize: 9, color: '#6b7280' },
  bankValue: { fontSize: 9, fontWeight: 'bold' },
});

// Utility function
function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
  });
}

// Image component is imported from react-pdf above
