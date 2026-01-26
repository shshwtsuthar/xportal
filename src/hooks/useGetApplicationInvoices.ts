import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/database.types';
import type { DepositFilters } from './useDepositsFilters';
import { serializeDepositsFilters } from './useDepositsFilters';

type ApplicationInvoiceRow = Tables<'application_invoices'> & {
  applications?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    student_id_display: string | null;
    program_id: string | null;
    programs?: Pick<Tables<'programs'>, 'name' | 'code' | 'id'> | null;
  } | null;
};

/**
 * Fetch application invoices (deposits) with comprehensive filters and joins.
 * Only returns invoices that haven't been migrated to enrollment.
 * @param filters optional deposit filters
 */
export const useGetApplicationInvoices = (filters?: DepositFilters) => {
  return useQuery({
    queryKey: [
      'application-invoices',
      filters ? serializeDepositsFilters(filters) : 'all',
    ],
    queryFn: async (): Promise<ApplicationInvoiceRow[]> => {
      const supabase = createClient();
      // Join applications -> programs for display
      // Only fetch invoices that haven't been migrated to enrollment
      let query = supabase
        .from('application_invoices')
        .select(
          `*, applications:application_id ( id, first_name, last_name, student_id_display, program_id, programs:program_id ( id, name, code ) )`
        )
        .eq('migrated_to_enrollment', false)
        .order('due_date', { ascending: true });

      if (!filters) {
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return (data as unknown as ApplicationInvoiceRow[]) ?? [];
      }

      // Text search (invoice number, student name, student ID)
      if (filters.search) {
        const term = `%${filters.search}%`;
        // Search in invoice number
        query = query.or(`invoice_number.ilike.${term}`);
        // Note: PostgREST doesn't easily support searching in nested relations
        // We'll filter client-side for student name/ID
      }

      // Statuses (application invoices can only be SCHEDULED or VOID)
      if (filters.statuses?.length) {
        query = query.in('status', filters.statuses);
      }

      // Internal payment status filter
      if (filters.internalPaymentStatuses?.length) {
        query = query.in(
          'internal_payment_status',
          filters.internalPaymentStatuses
        );
      }

      // Dates
      if (filters.issueDate?.from)
        query = query.gte('issue_date', filters.issueDate.from);
      if (filters.issueDate?.to)
        query = query.lte('issue_date', filters.issueDate.to);
      if (filters.dueDate?.from)
        query = query.gte('due_date', filters.dueDate.from);
      if (filters.dueDate?.to)
        query = query.lte('due_date', filters.dueDate.to);

      // Amounts (values in cents)
      if (filters.amountDue?.min !== undefined)
        query = query.gte(
          'amount_due_cents',
          Math.round(filters.amountDue.min)
        );
      if (filters.amountDue?.max !== undefined)
        query = query.lte(
          'amount_due_cents',
          Math.round(filters.amountDue.max)
        );
      if (filters.amountPaid?.min !== undefined)
        query = query.gte(
          'amount_paid_cents',
          Math.round(filters.amountPaid.min)
        );
      if (filters.amountPaid?.max !== undefined)
        query = query.lte(
          'amount_paid_cents',
          Math.round(filters.amountPaid.max)
        );

      // Program filter (via join)
      if (filters.programIds?.length) {
        // Use a subquery to find applications with matching program_ids
        const { data: apps, error: aErr } = await supabase
          .from('applications')
          .select('id, program_id')
          .in('program_id', filters.programIds);
        if (aErr) throw new Error(aErr.message);
        const appIds = (apps ?? []).map((a) => a.id);
        if (appIds.length > 0) {
          query = query.in('application_id', appIds);
        } else {
          // No matches, return empty
          return [];
        }
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      let rows = (data as unknown as ApplicationInvoiceRow[]) ?? [];

      // Client-side filters that require computation or nested relation search
      if (filters.search) {
        const term = filters.search.toLowerCase();
        rows = rows.filter((r) => {
          const invoiceNum = r.invoice_number?.toLowerCase() || '';
          const firstName = r.applications?.first_name?.toLowerCase() || '';
          const lastName = r.applications?.last_name?.toLowerCase() || '';
          const studentId =
            r.applications?.student_id_display?.toLowerCase() || '';
          const fullName = `${firstName} ${lastName}`.trim();
          return (
            invoiceNum.includes(term) ||
            fullName.includes(term) ||
            studentId.includes(term)
          );
        });
      }

      // Balance filter
      if (filters.balance) {
        const min = filters.balance.min ?? Number.NEGATIVE_INFINITY;
        const max = filters.balance.max ?? Number.POSITIVE_INFINITY;
        rows = rows.filter((r) => {
          const bal = (r.amount_due_cents ?? 0) - (r.amount_paid_cents ?? 0);
          return bal >= min && bal <= max;
        });
      }

      return rows;
    },
  });
};
