import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';
import type { StudentFilters } from './useStudentsFilters';
import { serializeFilters } from './useStudentsFilters';

/**
 * Fetch students with optional filtering.
 * Uses RLS via browser supabase client. Throws on errors.
 */
export const useGetStudents = (filters?: StudentFilters) => {
  return useQuery({
    queryKey: ['students', filters ? serializeFilters(filters) : 'all'],
    queryFn: async (): Promise<Tables<'students'>[]> => {
      const supabase = createClient();

      let query = supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (!filters) {
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data ?? [];
      }

      // Apply filters
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(
          `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},student_id_display.ilike.${searchTerm}`
        );
      }

      if (filters.statuses?.length) {
        query = query.in('status', filters.statuses);
      }

      if (filters.createdAt?.from) {
        query = query.gte('created_at', filters.createdAt.from);
      }
      if (filters.createdAt?.to) {
        query = query.lte('created_at', filters.createdAt.to);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
};
