import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getFunctionHeaders, FUNCTIONS_URL } from '@/lib/functions';

export interface CoursePlan {
  id: string;
  program_id: string;
  name: string;
  version: number;
  is_active: boolean;
  created_at?: string;
}

export interface PlanSubjectItem {
  subject_id: string;
  unit_type: 'Core' | 'Elective';
  sort_order?: number;
  estimated_duration_weeks?: number;
  complexity_level?: 'Basic' | 'Intermediate' | 'Advanced';
}

export interface PrerequisiteItem {
  subject_id: string;
  prerequisite_subject_id: string;
  prerequisite_type: 'Required' | 'Recommended';
}

export interface CoursePlanStructure {
  plan: CoursePlan;
  subjects: Array<PlanSubjectItem & {
    subject_identifier: string;
    subject_name: string;
    prerequisites_count: number;
    dependents_count: number;
  }>;
  prerequisites: Array<PrerequisiteItem & {
    id: string;
    subject_name: string;
    prerequisite_subject_name: string;
    created_at: string;
  }>;
  progression_validation: {
    is_valid: boolean;
    errors: Array<{
      type: string;
      message: string;
      subject_ids: string[];
    }>;
    warnings: Array<any>;
  };
}

export interface ProgressionPreview {
  intake_model: 'Fixed' | 'Rolling';
  total_duration_weeks: number;
  progression_phases: Array<{
    phase_number: number;
    subject_ids: string[];
    estimated_start_week: number;
    estimated_end_week: number;
  }>;
  fixed_intake_timeline: Array<{
    subject_id: string;
    subject_name: string;
    start_week: number;
    end_week: number;
    duration_weeks: number;
    prerequisites_completed_by_week: number;
  }>;
  rolling_intake_sequence: Array<{
    unlock_trigger: string;
    subjects_unlocked: Array<{
      subject_id: string;
      subject_name: string;
      estimated_duration_weeks: number;
      prerequisite_subjects: string[];
    }>;
  }>;
}

export const useCoursePlans = (programId: string | undefined) => {
  return useQuery<CoursePlan[]>({
    queryKey: ['course-plans', programId],
    enabled: !!programId,
    queryFn: async () => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${programId}/course-plans`, {
        headers: getFunctionHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load course plans');
      return res.json();
    },
  });
};

export const useCreateCoursePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { programId: string; name: string; version?: number; isActive?: boolean }) => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${payload.programId}/course-plans`, {
        method: 'POST',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: payload.name, version: payload.version ?? 1, isActive: payload.isActive ?? false }),
      });
      if (!res.ok) throw new Error('Failed to create course plan');
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['course-plans', vars.programId] });
    },
  });
};

export const usePlanSubjects = (programId: string | undefined, planId: string | undefined) => {
  return useQuery<PlanSubjectItem[]>({
    queryKey: ['course-plan-subjects', programId, planId],
    enabled: !!programId && !!planId,
    queryFn: async () => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${programId}/course-plans/${planId}/subjects`, {
        headers: getFunctionHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load plan subjects');
      return res.json();
    },
  });
};

export const useReplacePlanSubjects = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { programId: string; planId: string; items: PlanSubjectItem[] }) => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${payload.programId}/course-plans/${payload.planId}/subjects`, {
        method: 'PUT',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.items),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['course-plan-subjects', vars.programId, vars.planId] });
    },
  });
};

export const useCoursePlanStructure = (programId: string | undefined, planId: string | undefined) => {
  return useQuery<CoursePlanStructure>({
    queryKey: ['course-plan-structure', programId, planId],
    enabled: !!programId && !!planId,
    queryFn: async () => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${programId}/course-plans/${planId}/structure`, {
        headers: getFunctionHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load course plan structure');
      return res.json();
    },
  });
};

export const useCoursePlanPrerequisites = (programId: string | undefined, planId: string | undefined) => {
  return useQuery<PrerequisiteItem[]>({
    queryKey: ['course-plan-prerequisites', programId, planId],
    enabled: !!programId && !!planId,
    queryFn: async () => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${programId}/course-plans/${planId}/prerequisites`, {
        headers: getFunctionHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load prerequisites');
      return res.json();
    },
  });
};

export const useUpdateCoursePlanPrerequisites = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { programId: string; planId: string; prerequisites: PrerequisiteItem[] }) => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${payload.programId}/course-plans/${payload.planId}/prerequisites`, {
        method: 'PUT',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.prerequisites),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['course-plan-prerequisites', vars.programId, vars.planId] });
      qc.invalidateQueries({ queryKey: ['course-plan-structure', vars.programId, vars.planId] });
    },
  });
};

export const useValidateCoursePlanProgression = () => {
  return useMutation({
    mutationFn: async (payload: { programId: string; planId: string }) => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${payload.programId}/course-plans/${payload.planId}/validate-progression`, {
        method: 'POST',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
};

export const usePreviewCoursePlanProgression = () => {
  return useMutation({
    mutationFn: async (payload: { 
      programId: string; 
      planId: string; 
      intake_model: 'Fixed' | 'Rolling';
      start_date?: string;
      simulation_duration_weeks?: number;
      requestedStartDate?: string;
      catchupMode?: 'SequentialNextTerm' | 'ParallelNextTerm';
      cycles?: number;
    }) => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${payload.programId}/course-plans/${payload.planId}/progression-preview`, {
        method: 'POST',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_model: payload.intake_model,
          start_date: payload.start_date,
          simulation_duration_weeks: payload.simulation_duration_weeks,
          requestedStartDate: payload.requestedStartDate,
          catchupMode: payload.catchupMode,
          cycles: payload.cycles,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<ProgressionPreview>;
    },
  });
};

// Hook for getting course plans by program
export const useProgramCoursePlans = (programId?: string) => {
  return useQuery({
    queryKey: ['course-plans', programId],
    queryFn: async () => {
      if (!programId) return [];
      
      const response = await fetch(
        `${FUNCTIONS_URL}/course-plans/programs/${programId}/course-plans`,
        {
          headers: getFunctionHeaders(),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch course plans');
      }
      
      return response.json() as Promise<CoursePlan[]>;
    },
    enabled: !!programId,
  });
};

// Transform course plans for select components
export const transformCoursePlansForSelect = (coursePlans: CoursePlan[] = []) => {
  return coursePlans.map(plan => ({
    value: plan.id,
    label: `${plan.name} (v${plan.version})`,
    isActive: plan.is_active,
  }));
};


