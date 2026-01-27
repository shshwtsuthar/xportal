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
            'id, invoice_number, status, issue_date, due_date, amount_due_cents, amount_paid_cents'
          )
          .eq('invoice_number', invoiceNumber)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return null;
        return {
          id: data.id,
          invoice_number: data.invoice_number,
          invoice_type: 'APPLICATION' as InvoiceType,
          status: data.status as string | null,
          issue_date: data.issue_date,
          due_date: data.due_date,
          amount_due_cents: data.amount_due_cents,
          amount_paid_cents: data.amount_paid_cents,
        };
      };

      const tryEnrollment = async () => {
        const { data, error } = await supabase
          .from('enrollment_invoices')
          .select(
            'id, invoice_number, status, issue_date, due_date, amount_due_cents, amount_paid_cents'
          )
          .eq('invoice_number', invoiceNumber)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return null;
        return {
          id: data.id,
          invoice_number: data.invoice_number,
          invoice_type: 'ENROLLMENT' as InvoiceType,
          status: data.status as string | null,
          issue_date: data.issue_date,
          due_date: data.due_date,
          amount_due_cents: data.amount_due_cents,
          amount_paid_cents: data.amount_paid_cents,
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
