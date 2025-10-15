import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables, Enums } from '@/database.types';

/**
 * Fetch students with optional search and status filtering.
 * Uses RLS via browser supabase client. Throws on errors.
 */
export type StudentStatus = Enums<'student_status'>;

type Filters = {
  q?: string;
  status?: StudentStatus;
  page?: number;
  pageSize?: number;
};

export const useGetStudents = (filters: Filters) => {
  const { q, status, page = 1, pageSize = 20 } = filters;

  return useQuery({
    queryKey: [
      'students',
      { q: q ?? '', status: status ?? 'all', page, pageSize },
    ],
    queryFn: async (): Promise<
      Pick<
        Tables<'students'>,
        | 'id'
        | 'student_id_display'
        | 'first_name'
        | 'last_name'
        | 'email'
        | 'status'
        | 'created_at'
      >[]
    > => {
      const supabase = createClient();

      let query = supabase
        .from('students')
        .select(
          'id, student_id_display, first_name, last_name, email, status, created_at',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (q && q.trim().length > 0) {
        const term = q.trim();
        query = query.or(
          `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`
        );
      }

      if (status && typeof status === 'string') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
};
