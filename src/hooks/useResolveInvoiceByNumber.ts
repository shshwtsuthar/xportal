import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { InvoiceType } from './useGetInvoicePayments';

export type ResolvedInvoiceByNumber = {
  id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  status: string | null;
  issue_date: string | null;
  due_date: string | null;
  amount_due_cents: number | null;
  amount_paid_cents: number | null;
  client_name?: string | null;
};

export const useResolveInvoiceByNumber = (
  invoiceNumber?: string,
  preferredType?: InvoiceType
) => {
  return useQuery({
    queryKey: ['invoice-by-number', invoiceNumber, preferredType],
    enabled: !!invoiceNumber,
    queryFn: async (): Promise<ResolvedInvoiceByNumber | null> => {
      if (!invoiceNumber) return null;

      const supabase = createClient();

      const tryApplication = async () => {
        const { data, error } = await supabase
          .from('application_invoices')
          .select(
            'id, invoice_number, status, issue_date, due_date, amount_due_cents, amount_paid_cents, applications:application_id(first_name, last_name)'
          )
          .eq('invoice_number', invoiceNumber)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return null;
        const app = data.applications as {
          first_name: string | null;
          last_name: string | null;
        } | null;
        const client_name = app
          ? [app.first_name, app.last_name].filter(Boolean).join(' ') || null
          : null;
        return {
          id: data.id,
          invoice_number: data.invoice_number,
          invoice_type: 'APPLICATION' as InvoiceType,
          status: data.status as string | null,
          issue_date: data.issue_date,
          due_date: data.due_date,
          amount_due_cents: data.amount_due_cents,
          amount_paid_cents: data.amount_paid_cents,
          client_name,
        };
      };

      const tryEnrollment = async () => {
        const { data, error } = await supabase
          .from('enrollment_invoices')
          .select(
            'id, invoice_number, status, issue_date, due_date, amount_due_cents, amount_paid_cents, enrollments:enrollment_id(students:student_id(first_name, last_name))'
          )
          .eq('invoice_number', invoiceNumber)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return null;
        const enrollments = data.enrollments as {
          students?: {
            first_name: string | null;
            last_name: string | null;
          } | null;
        } | null;
        const students = enrollments?.students;
        const client_name =
          students && (students.first_name || students.last_name)
            ? [students.first_name, students.last_name]
                .filter(Boolean)
                .join(' ') || null
            : null;
        return {
          id: data.id,
          invoice_number: data.invoice_number,
          invoice_type: 'ENROLLMENT' as InvoiceType,
          status: data.status as string | null,
          issue_date: data.issue_date,
          due_date: data.due_date,
          amount_due_cents: data.amount_due_cents,
          amount_paid_cents: data.amount_paid_cents,
          client_name,
        };
      };

      if (preferredType === 'APPLICATION') {
        const app = await tryApplication();
        if (app) return app;
        const enr = await tryEnrollment();
        return enr;
      }

      if (preferredType === 'ENROLLMENT') {
        const enr = await tryEnrollment();
        if (enr) return enr;
        const app = await tryApplication();
        return app;
      }

      const app = await tryApplication();
      if (app) return app;
      const enr = await tryEnrollment();
      return enr;
    },
  });
};
