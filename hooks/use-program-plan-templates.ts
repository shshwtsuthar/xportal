import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FUNCTIONS_URL, getFunctionHeaders } from '@/lib/functions';

export interface ProgramPlanTemplate {
  id: string;
  program_id: string;
  name: string;
  version: number;
  is_active: boolean;
  created_at: string;
}

export interface ProgramPlanSubject {
  subject_id: string;
  subject_identifier: string;
  subject_name: string;
  unit_type: 'Core' | 'Elective';
  sort_order: number;
  duration_weeks: number;
}

export interface ProgramPlanSubjectInput {
  subject_id: string;
  unit_type: 'Core' | 'Elective';
  sort_order?: number;
  duration_weeks?: number;
  complexity_level?: 'Basic' | 'Intermediate' | 'Advanced';
}

// Hook to fetch program plan templates for a specific program
export const useProgramPlanTemplates = (programId: string) => {
  return useQuery({
    queryKey: ['program-plan-templates', programId],
    queryFn: async (): Promise<{ data: ProgramPlanTemplate[] }> => {
      const response = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${programId}/course-plans`, {
        headers: getFunctionHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch program plan templates');
      }

      const raw: unknown = await response.json();
      if (Array.isArray(raw)) {
        return { data: raw };
      }
      return { data: [] };
    },
    enabled: !!programId,
  });
};

// Hook to fetch subjects for a specific program plan template
export const useProgramPlanSubjects = (programId: string, planId: string) => {
  return useQuery({
    queryKey: ['program-plan-subjects', programId, planId],
    queryFn: async (): Promise<{ data: ProgramPlanSubject[] }> => {
      const response = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${programId}/course-plans/${planId}/subjects`, {
        headers: getFunctionHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch program plan subjects');
      }

      const raw: unknown = await response.json();
      if (Array.isArray(raw)) {
        return { data: raw };
      }
      return { data: [] };
    },
    enabled: !!programId && !!planId,
  });
};

// Hook to create a new program plan template
export const useCreateProgramPlanTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ programId, data }: { programId: string; data: { name: string; version?: number; isActive?: boolean } }) => {
      const response = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${programId}/course-plans`, {
        method: 'POST',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create program plan template');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['program-plan-templates', variables.programId] });
    },
  });
};

// Hook to update subjects for a program plan template
export const useUpdateProgramPlanSubjects = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      programId, 
      planId, 
      subjects 
    }: { 
      programId: string; 
      planId: string; 
      subjects: ProgramPlanSubjectInput[] 
    }) => {
      const response = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${programId}/course-plans/${planId}/subjects`, {
        method: 'PUT',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(subjects),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update program plan subjects');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['program-plan-subjects', variables.programId, variables.planId] });
    },
  });
};

// Hook to get complete course plan structure
export const useProgramPlanStructure = (programId: string, planId: string) => {
  return useQuery({
    queryKey: ['program-plan-structure', programId, planId],
    queryFn: async () => {
      const response = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${programId}/course-plans/${planId}/structure`, {
        headers: getFunctionHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch program plan structure');
      }

      return response.json();
    },
    enabled: !!programId && !!planId,
  });
};
