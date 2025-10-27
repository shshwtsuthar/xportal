import { Tables } from '@/database.types';
import type { InvoicePdfData } from './InvoiceTemplate';

export function buildInvoiceData(input: {
  invoice: Tables<'invoices'> & {
    enrollments?: Pick<
      Tables<'enrollments'>,
      'id' | 'student_id' | 'rto_id'
    > | null;
    students?: Pick<
      Tables<'students'>,
      'id' | 'first_name' | 'last_name' | 'email'
    > | null;
    rtos?: Pick<
      Tables<'rtos'>,
      'id' | 'name' | 'address_line_1' | 'suburb' | 'state' | 'postcode'
    > | null;
  };
}): InvoicePdfData {
  const { invoice } = input;
  const rto = invoice.rtos ?? null;
  const student = invoice.students ?? null;
  return {
    rtoName: rto?.name ?? 'RTO',
    rtoAddress:
      [rto?.address_line_1, rto?.suburb, rto?.state, rto?.postcode]
        .filter(Boolean)
        .join(' ') || undefined,
    studentName: [student?.first_name, student?.last_name]
      .filter(Boolean)
      .join(' '),
    studentEmail: student?.email ?? null,
    invoiceNumber: String(invoice.invoice_number),
    issueDate: String(invoice.issue_date),
    dueDate: String(invoice.due_date),
    amountDueCents: invoice.amount_due_cents ?? 0,
  };
}
