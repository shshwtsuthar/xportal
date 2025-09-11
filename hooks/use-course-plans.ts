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


