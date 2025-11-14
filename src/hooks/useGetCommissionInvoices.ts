import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/database.types';

type CommissionInvoiceRow = Tables<'commission_invoices'> & {
  agents?: Pick<Tables<'agents'>, 'name' | 'id'> | null;
  students?: Pick<
    Tables<'students'>,
    'first_name' | 'last_name' | 'student_id_display' | 'id'
  > | null;
};

export type CommissionInvoiceFilters = {
  statuses?: ('UNPAID' | 'PAID' | 'CANCELLED')[];
  agentId?: string;
  search?: string;
  issueDate?: {
    from?: string;
    to?: string;
  };
};

/**
 * Fetch commission invoices with filters and joins.
 * @param filters optional commission invoice filters
 */
export const useGetCommissionInvoices = (
  filters?: CommissionInvoiceFilters
) => {
  return useQuery({
    queryKey: [
      'commission-invoices',
      filters ? JSON.stringify(filters) : 'all',
    ],
    queryFn: async (): Promise<CommissionInvoiceRow[]> => {
      const supabase = createClient();
      // Join agents and students for display
      let query = supabase
        .from('commission_invoices')
        .select(
          `*, agents:agent_id ( id, name ), students:student_id ( id, first_name, last_name, student_id_display )`
        )
        .order('issue_date', { ascending: false });

      if (!filters) {
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return (data as unknown as CommissionInvoiceRow[]) ?? [];
      }

      // Status filter
      if (filters.statuses?.length) {
        query = query.in('status', filters.statuses);
      }

      // Agent filter
      if (filters.agentId) {
        query = query.eq('agent_id', filters.agentId);
      }

      // Text search on invoice_number and agent/student names
      if (filters.search) {
        const term = `%${filters.search}%`;
        query = query.or(`invoice_number.ilike.${term}`);
      }

      // Date range filter
      if (filters.issueDate?.from) {
        query = query.gte('issue_date', filters.issueDate.from);
      }
      if (filters.issueDate?.to) {
        query = query.lte('issue_date', filters.issueDate.to);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      let rows = (data as unknown as CommissionInvoiceRow[]) ?? [];

      // Client-side filtering for search across joined fields
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        rows = rows.filter((r) => {
          const agentName = r.agents?.name?.toLowerCase() || '';
          const studentName =
            `${r.students?.first_name || ''} ${r.students?.last_name || ''}`.toLowerCase();
          const studentId = r.students?.student_id_display?.toLowerCase() || '';
          const invoiceNumber = r.invoice_number?.toLowerCase() || '';

          return (
            invoiceNumber.includes(searchLower) ||
            agentName.includes(searchLower) ||
            studentName.includes(searchLower) ||
            studentId.includes(searchLower)
          );
        });
      }

      return rows;
    },
  });
};
