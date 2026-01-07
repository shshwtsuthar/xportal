import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Json } from '@/database.types';
import { Tables } from '@/database.types';

type ProgramPlanSubjectWithSubject = Tables<'program_plan_subjects'> & {
  subjects: Tables<'subjects'> | null;
};
import { useUpsertClassTemplate } from './useUpsertClassTemplate';
import { useExpandTemplate, ExpandTemplateResult } from './useExpandTemplate';

export type BatchCreateTemplatePayload = {
  programPlanId: string;
  subjects: ProgramPlanSubjectWithSubject[];
  template_name?: string | null;
  recurrence_type: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  start_date: Date;
  end_date: Date;
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

export type BatchCreateResult = {
  success: boolean;
  error?: string;
  total_subjects: number;
  successful_subjects: number;
  failed_subjects: number;
  total_classes_created: number;
  total_blackout_dates_skipped: number;
  subject_results: Array<{
    subject_id: string;
    subject_name: string;
    success: boolean;
    error?: string;
    classes_created?: number;
    blackout_dates_skipped?: number;
    conflicts?: ExpandTemplateResult['conflicts'];
  }>;
};

/**
 * Adjust dates to fit within a subject's date range
 * If the requested date range is outside the subject's bounds, clamp to the subject's range
 */
const adjustDateToSubjectRange = (
  requestedDate: Date,
  subjectStartDate: string,
  subjectEndDate: string
): Date => {
  const subjectStart = new Date(subjectStartDate);
  const subjectEnd = new Date(subjectEndDate);

  if (requestedDate < subjectStart) {
    return subjectStart;
  }
  if (requestedDate > subjectEnd) {
    return subjectEnd;
  }
  return requestedDate;
};

/**
 * Batch create recurring class templates across multiple subjects
 */
export const useBatchCreateTemplates = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Use the existing hooks internally
  const upsertTemplate = useUpsertClassTemplate();
  const expandTemplate = useExpandTemplate();

  return useMutation({
    mutationFn: async (
      payload: BatchCreateTemplatePayload
    ): Promise<BatchCreateResult> => {
      const {
        programPlanId,
        subjects,
        template_name,
        recurrence_type,
        start_date,
        end_date,
        recurrence_pattern,
        start_time,
        end_time,
        trainer_id,
        location_id,
        classroom_id,
        group_id,
        class_type,
        notes,
      } = payload;

      // Get RTO ID for the program plan
      const { data: programPlan, error: planError } = await supabase
        .from('program_plans')
        .select('rto_id')
        .eq('id', programPlanId)
        .single();

      if (planError)
        throw new Error(`Failed to get program plan: ${planError.message}`);
      if (!programPlan) throw new Error('Program plan not found');

      const results: BatchCreateResult['subject_results'] = [];
      let totalClassesCreated = 0;
      let totalBlackoutDatesSkipped = 0;
      let successfulSubjects = 0;
      let failedSubjects = 0;

      // Process each subject
      for (const subject of subjects) {
        try {
          // Adjust dates to fit within subject's date range
          const adjustedStartDate = adjustDateToSubjectRange(
            start_date,
            subject.start_date,
            subject.end_date
          );
          const adjustedEndDate = adjustDateToSubjectRange(
            end_date,
            subject.start_date,
            subject.end_date
          );

          // Create template for this subject
          const template = await upsertTemplate.mutateAsync({
            rto_id: programPlan.rto_id,
            program_plan_subject_id: subject.id,
            template_name,
            recurrence_type,
            start_date: adjustedStartDate.toISOString().split('T')[0], // YYYY-MM-DD
            end_date: adjustedEndDate.toISOString().split('T')[0],
            recurrence_pattern,
            start_time,
            end_time,
            trainer_id,
            location_id,
            classroom_id,
            group_id,
            class_type,
            notes,
          });

          // Expand the template to create classes
          const expansionResult = await expandTemplate.mutateAsync({
            templateId: template.id,
            preserveEdited: true,
            programPlanSubjectId: subject.id,
          });

          if (expansionResult.success) {
            successfulSubjects++;
            totalClassesCreated += expansionResult.classes_created || 0;
            totalBlackoutDatesSkipped +=
              expansionResult.blackout_dates_skipped || 0;

            results.push({
              subject_id: subject.id,
              subject_name: subject.subjects?.name || 'Unknown Subject',
              success: true,
              classes_created: expansionResult.classes_created,
              blackout_dates_skipped: expansionResult.blackout_dates_skipped,
              conflicts: expansionResult.conflicts,
            });
          } else {
            failedSubjects++;
            results.push({
              subject_id: subject.id,
              subject_name: subject.subjects?.name || 'Unknown Subject',
              success: false,
              error: expansionResult.error,
            });
          }
        } catch (error) {
          failedSubjects++;
          results.push({
            subject_id: subject.id,
            subject_name: subject.subjects?.name || 'Unknown Subject',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Invalidate queries for all affected subjects
      subjects.forEach((subject) => {
        queryClient.invalidateQueries({
          queryKey: ['class-templates', subject.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['program-plan-classes', subject.id],
        });
      });

      return {
        success: failedSubjects === 0,
        total_subjects: subjects.length,
        successful_subjects: successfulSubjects,
        failed_subjects: failedSubjects,
        total_classes_created: totalClassesCreated,
        total_blackout_dates_skipped: totalBlackoutDatesSkipped,
        subject_results: results,
      };
    },
  });
};
