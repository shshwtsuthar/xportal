import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Json } from '@/database.types';

type UpsertTemplatePayload = {
  id?: string;
  rto_id: string;
  program_plan_subject_id: string;
  template_name?: string | null;
  recurrence_type: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  start_date: string;
  end_date: string;
  recurrence_pattern: Json;
  start_time: string;
  end_time: string;
  trainer_id?: string | null;
  location_id: string;
  classroom_id?: string | null;
  group_id: string;
  class_type?:
    | 'THEORY'
    | 'WORKSHOP'
    | 'LAB'
    | 'ONLINE'
    | 'HYBRID'
    | 'ASSESSMENT'
    | null;
  notes?: string | null;
};

/**
 * Create or update a class template
 */
export const useUpsertClassTemplate = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpsertTemplatePayload) => {
      const { data, error } = await supabase
        .from('program_plan_class_templates')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['class-templates', variables.program_plan_subject_id],
      });
    },
  });
};
