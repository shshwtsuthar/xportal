import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Json } from '@/database.types';

type RecurrencePattern = {
  interval?: number;
  days_of_week?: number[];
  day_of_month?: number;
  custom_dates?: string[];
};

export type ClassTemplate = {
  id: string;
  rto_id: string;
  program_plan_subject_id: string;
  template_name: string | null;
  recurrence_type: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  start_date: string;
  end_date: string;
  recurrence_pattern: RecurrencePattern;
  start_time: string;
  end_time: string;
  trainer_id: string | null;
  location_id: string;
  classroom_id: string | null;
  group_id: string;
  class_type: string | null;
  notes: string | null;
  is_expanded: boolean;
  expanded_at: string | null;
  last_expanded_at: string | null;
  generated_class_count: number;
  conflicts_detected: Json | null;
  created_at: string;
  updated_at: string;
  delivery_locations?: { name: string } | null;
  classrooms?: { name: string } | null;
  groups?: { name: string } | null;
  profiles?: { first_name: string; last_name: string } | null;
};

/**
 * Fetch class templates for a given program plan subject
 */
export const useGetClassTemplates = (
  programPlanSubjectId: string | undefined
) => {
  const supabase = createClient();

  return useQuery({
    queryKey: ['class-templates', programPlanSubjectId],
    queryFn: async () => {
      if (!programPlanSubjectId) {
        return [];
      }

      const { data, error } = await supabase
        .from('program_plan_class_templates')
        .select(
          `
          *,
          delivery_locations:location_id(name),
          classrooms:classroom_id(name),
          groups:group_id(name),
          profiles:trainer_id(first_name, last_name)
        `
        )
        .eq('program_plan_subject_id', programPlanSubjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ClassTemplate[];
    },
    enabled: !!programPlanSubjectId,
  });
};
