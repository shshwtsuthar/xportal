import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Json } from '@/database.types';

export type BatchRecurringClassPayload = {
  programPlanId: string;
  subjectIds: string[];
  recurrenceType: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrencePattern: Json;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  trainerId?: string | null;
  locationId?: string | null;
  classroomId?: string | null;
  groupId?: string | null;
  classType?:
    | 'THEORY'
    | 'WORKSHOP'
    | 'LAB'
    | 'ONLINE'
    | 'HYBRID'
    | 'ASSESSMENT'
    | null;
  notes?: string | null;
  filterBySubjectRange?: boolean;
};

export type BatchRecurringClassResult = {
  success: boolean;
  subjects_processed: number;
  total_classes_created: number;
  date_range_filtered: boolean;
  results: Array<{
    success: boolean;
    classes_created: number;
    blackout_dates_skipped: number;
    date_range_filtered: boolean;
    subject_id: string;
  }>;
};

/**
 * Batch create recurring classes for multiple subjects (no templates)
 */
export const useCreateRecurringClassesBatch = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: BatchRecurringClassPayload
    ): Promise<BatchRecurringClassResult> => {
      const { data, error } = await supabase.rpc(
        'create_recurring_classes_batch',
        {
          p_program_plan_id: payload.programPlanId,
          p_subject_ids: payload.subjectIds,
          p_recurrence_type: payload.recurrenceType,
          p_recurrence_pattern: payload.recurrencePattern,
          p_start_date: payload.startDate,
          p_end_date: payload.endDate,
          p_start_time: payload.startTime,
          p_end_time: payload.endTime,
          p_trainer_id: payload.trainerId ?? undefined,
          p_location_id: payload.locationId ?? undefined,
          p_classroom_id: payload.classroomId ?? undefined,
          p_group_id: payload.groupId ?? undefined,
          p_class_type: payload.classType ?? undefined,
          p_notes: payload.notes ?? undefined,
          p_filter_by_subject_range: payload.filterBySubjectRange ?? true,
        }
      );

      if (error) throw error;
      return data as BatchRecurringClassResult;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries for all affected subjects
      variables.subjectIds.forEach((subjectId) => {
        queryClient.invalidateQueries({
          queryKey: ['program-plan-classes', subjectId],
        });
      });
    },
  });
};
