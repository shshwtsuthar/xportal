import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/database.types';
import type { InvoiceFilters } from './useInvoicesFilters';
import { serializeInvoicesFilters } from './useInvoicesFilters';

type InvoiceRow = Tables<'invoices'> & {
  enrollments?: {
    student_id: string;
    program_id: string;
    students?: Pick<
      Tables<'students'>,
      'first_name' | 'last_name' | 'student_id_display' | 'id'
    > | null;
    programs?: Pick<Tables<'programs'>, 'name' | 'code' | 'id'> | null;
  } | null;
};

/**
 * Fetch invoices with comprehensive filters and joins.
 * @param filters optional invoice filters
 */
export const useGetInvoices = (filters?: InvoiceFilters) => {
  return useQuery({
    queryKey: ['invoices', filters ? serializeInvoicesFilters(filters) : 'all'],
    queryFn: async (): Promise<InvoiceRow[]> => {
      const supabase = createClient();
      // Join enrollments -> students/programs for display
      let query = supabase
        .from('invoices')
        .select(
          `*, enrollments:enrollment_id ( student_id, program_id, students:student_id ( id, first_name, last_name, student_id_display ), programs:program_id ( id, name, code ) )`
        )
        .order('due_date', { ascending: true });

      if (!filters) {
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return (data as unknown as InvoiceRow[]) ?? [];
      }

      // Text search
      if (filters.search) {
        const term = `%${filters.search}%`;
        query = query.or(`invoice_number.ilike.${term}`);
      }

      // Statuses
      if (filters.statuses?.length) {
        query = query.in('status', filters.statuses);
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

      // Balance cannot be filtered server-side directly; handled client-side in table

      // Program filter (via join)
      if (filters.programIds?.length) {
        // PostgREST cannot filter nested relation directly by alias in same call in a simple way
        // We'll use a subquery via `.in('enrollment_id', ...)` after fetching matching enrollments
        const { data: enrolls, error: eErr } = await supabase
          .from('enrollments')
          .select('id, program_id')
          .in('program_id', filters.programIds);
        if (eErr) throw new Error(eErr.message);
        const ids = (enrolls ?? []).map((e) => e.id);
        if (ids.length > 0) {
          query = query.in('enrollment_id', ids);
        } else {
          // No matches, return empty
          return [];
        }
      }

      if (filters.emailed === 'yes')
        query = query.not('last_email_sent_at', 'is', null);
      else if (filters.emailed === 'no')
        query = query.is('last_email_sent_at', null);

      if (filters.hasPdf === 'yes') query = query.not('pdf_path', 'is', null);
      else if (filters.hasPdf === 'no') query = query.is('pdf_path', null);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      let rows = (data as unknown as InvoiceRow[]) ?? [];

      // Client-side filters that require computation
      if (filters.balance) {
        const min = filters.balance.min ?? Number.NEGATIVE_INFINITY;
        const max = filters.balance.max ?? Number.POSITIVE_INFINITY;
        rows = rows.filter((r) => {
          const bal = (r.amount_due_cents ?? 0) - (r.amount_paid_cents ?? 0);
          return bal >= min && bal <= max;
        });
      }
      if (filters.overdueDays) {
        const now = new Date();
        const min = filters.overdueDays.min ?? Number.NEGATIVE_INFINITY;
        const max = filters.overdueDays.max ?? Number.POSITIVE_INFINITY;
        rows = rows.filter((r) => {
          if (!r.due_date) return false;
          if (r.status === 'PAID' || r.status === 'VOID') return false;
          const due = new Date(r.due_date);
          const days = Math.floor(
            (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
          );
          return days >= min && days <= max;
        });
      }

      return rows;
    },
  });
};
