import { Tables } from '@/database.types';
import type { InvoicePdfData } from './InvoiceTemplate';

type InvoiceInput = (
  | Tables<'enrollment_invoices'>
  | Tables<'application_invoices'>
) & {
  enrollments?: Pick<Tables<'enrollments'>, 'id' | 'student_id'> | null;
  students?: Pick<
    Tables<'students'>,
    'id' | 'first_name' | 'last_name' | 'email'
  > | null;
  rtos?: Tables<'rtos'> | null;
  invoice_lines?:
    | Tables<'enrollment_invoice_lines'>[]
    | Tables<'application_invoice_lines'>[]
    | null;
  enrollment_invoice_lines?: Tables<'enrollment_invoice_lines'>[] | null;
  application_invoice_lines?: Tables<'application_invoice_lines'>[] | null;
  student_addresses?: Tables<'student_addresses'>[] | null;
};

export function buildInvoiceData(input: {
  invoice: InvoiceInput;
}): InvoicePdfData {
  const { invoice } = input;
  const invoiceLines = (invoice.invoice_lines ??
    (
      invoice as {
        enrollment_invoice_lines?: Tables<'enrollment_invoice_lines'>[];
      }
    ).enrollment_invoice_lines ??
    (
      invoice as {
        application_invoice_lines?: Tables<'application_invoice_lines'>[];
      }
    ).application_invoice_lines ??
    []) as Array<{
    amount_cents: number;
    description: string | null;
    name: string;
    sequence_order: number;
  }>;
  const studentAddresses = invoice.student_addresses ?? [];
  const rto = invoice.rtos ?? null;
  const student = invoice.students ?? null;

  // 1. Logic to find the best address (Primary -> First available -> Empty)
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

  // 2. Format RTO Address
  const rtoAddress = [
    rto?.address_line_1,
    rto?.suburb,
    rto?.state,
    rto?.postcode,
  ]
    .filter(Boolean)
    .join(', ');

  // 3. Calculate Financials
  // Assuming amount_cents is stored as an integer (e.g. $10.00 = 1000)
  const totalAmountCents = invoiceLines.reduce(
    (acc: number, line: { amount_cents: number }) => acc + line.amount_cents,
    0
  );
  const amountPaidCents =
    (invoice as { amount_paid_cents?: number }).amount_paid_cents ?? 0;
  const balanceDueCents = totalAmountCents - amountPaidCents;

  return {
    // RTO Details (Dynamic from DB)
    rtoName: rto?.name ?? 'RTO Name',
    rtoAddress: rtoAddress,
    rtoCode: rto?.rto_code ?? '',
    cricosCode: rto?.cricos_code ?? '',
    rtoEmail: rto?.email_address ?? '',
    rtoPhone: rto?.phone_number ?? '',
    rtoLogoUrl: rto?.profile_image_path ?? null,

    // Student Details
    studentName: [student?.first_name, student?.last_name]
      .filter(Boolean)
      .join(' ')
      .toUpperCase(),
    studentAddress: formattedStudentAddress,

    // Invoice Meta
    invoiceNumber: invoice.invoice_number,
    issueDate: new Date(invoice.issue_date).toLocaleDateString('en-AU'),
    dueDate: new Date(invoice.due_date).toLocaleDateString('en-AU'),
    // Instructions for Order No integration are below; hardcoded for now as requested.
    orderNo: '',
    datePaid:
      amountPaidCents >= totalAmountCents
        ? new Date().toLocaleDateString('en-AU') // Or use a specific 'paid_at' field if you have one
        : '',

    // Line Items
    lines: invoiceLines
      .sort(
        (a: { sequence_order?: number }, b: { sequence_order?: number }) =>
          (a.sequence_order ?? 0) - (b.sequence_order ?? 0)
      )
      .map(
        (l: {
          description: string | null;
          name: string;
          amount_cents: number;
        }) => ({
          description: l.description || l.name,
          amountCents: l.amount_cents,
        })
      ),

    // Financial Totals
    totalAmountCents,
    amountPaidCents,
    balanceDueCents,
    // Assuming GST is included or calculated separately.
    // If you need to calculate 10% GST from the total: totalAmountCents / 11
    gstCents: 0,

    // Bank Details (Dynamic from DB)
    bankDetails: {
      bankName: rto?.bank_name ?? '',
      accountName: rto?.bank_account_name ?? '',
      bsb: rto?.bank_bsb ?? '',
      accountNo: rto?.bank_account_number ?? '',
    },
  };
}
