import { useQuery } from '@tanstack/react-query';
import { Tables } from '@/database.types';
import { createClient } from '@/lib/supabase/client';

export type FinanceLogEntry = Tables<'finance_logs_view'>;

export type FinanceLogFilters = {
  types?: string[];
  statuses?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

/**
 * Fetch unified finance log entries from the finance_logs_view.
 *
 * @param filters optional filter object
 */
export const useGetFinanceLogs = (filters?: FinanceLogFilters) => {
  return useQuery<FinanceLogEntry[]>({
    queryKey: ['finance-logs', filters],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('finance_logs_view')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(200);

      if (filters?.types && filters.types.length > 0) {
        query = query.in('event_type', filters.types);
      }

      if (filters?.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      }

      if (filters?.dateFrom) {
        query = query.gte('occurred_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('occurred_at', filters.dateTo);
      }

      if (filters?.search && filters.search.trim().length > 0) {
        const term = filters.search.trim();
        query = query.or(
          [
            `invoice_number.ilike.%${term}%`,
            `student_name.ilike.%${term}%`,
            `student_email.ilike.%${term}%`,
            `program_name.ilike.%${term}%`,
            `message.ilike.%${term}%`,
          ].join(',')
        );
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
};
