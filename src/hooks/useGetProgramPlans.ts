import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

export type ProgramPlanWithGroup = Tables<'program_plans'> & {
  groups?: Tables<'groups'> | Tables<'groups'>[] | null;
};

/**
 * Fetch program plans with group data, optionally filtered by programId and/or groupId.
 */
export const useGetProgramPlans = (programId?: string, groupId?: string) => {
  return useQuery({
    queryKey: ['programPlans', programId ?? 'all', groupId ?? 'all'],
    queryFn: async (): Promise<ProgramPlanWithGroup[]> => {
      const supabase = createClient();
      let query = supabase.from('program_plans').select('*, groups(*)');
      if (programId) query = query.eq('program_id', programId);
      if (groupId) query = query.eq('group_id', groupId);
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
