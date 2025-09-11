import { useQuery } from '@tanstack/react-query';
import { FUNCTIONS_URL, getFunctionHeaders } from '@/lib/functions';

// =============================================================================
// PROGRAMS AND COURSE OFFERINGS HOOKS
// Integrates with our 97% functional backend programs endpoints
// =============================================================================

interface Program {
  id: string;
  name: string;
  programCode: string;
  description?: string;
  duration?: number;
  level?: string;
}

interface CourseOffering {
  id: string;
  programId: string;
  name: string;
  startDate: string;
  endDate: string;
  maxEnrolments?: number;
  currentEnrolments?: number;
  status: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  isCore: boolean;
  credits?: number;
}

interface ProgramsResponse {
  data: Program[];
}

interface CourseOfferingsResponse {
  data: CourseOffering[];
}

interface ProgramSubjectsResponse {
  data: Subject[];
}

// Base URL and headers centralized in lib/functions

// Hook for fetching all programs
export const usePrograms = () => {
  return useQuery<ProgramsResponse>({
    queryKey: ['programs'],
    queryFn: async () => {
      const response = await fetch(`${FUNCTIONS_URL}/programs`, { headers: getFunctionHeaders() });
      if (!response.ok) {
        throw new Error('Failed to fetch programs');
      }
      const raw: any = await response.json();
      // Normalize to { data: Program[] }
      if (Array.isArray(raw)) {
        const data: Program[] = raw.map((p: any) => ({
          id: p.id,
          name: p.program_name ?? p.programName ?? p.name ?? '',
          programCode: p.program_code ?? p.programCode ?? p.program_identifier ?? p.programIdentifier ?? '',
          description: p.description ?? undefined,
          level: p.level ?? undefined,
          duration: p.duration ?? undefined,
        }));
        return { data };
      }
      return raw as ProgramsResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for fetching a specific program
export const useProgram = (programId: string) => {
  return useQuery<Program>({
    queryKey: ['program', programId],
    queryFn: async () => {
      const response = await fetch(`${FUNCTIONS_URL}/programs/${programId}`, { headers: getFunctionHeaders() });
      if (!response.ok) {
        throw new Error('Failed to fetch program');
      }
      return response.json();
    },
    enabled: !!programId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Hook for fetching course offerings for a program
export const useCourseOfferings = (programId: string) => {
  return useQuery<CourseOfferingsResponse>({
    queryKey: ['course-offerings', programId],
    queryFn: async () => {
      // Use function-prefixed path through the gateway
      const response = await fetch(`${FUNCTIONS_URL}/course-offerings/programs/${programId}/offerings`, { headers: getFunctionHeaders() });
      if (!response.ok) {
        throw new Error('Failed to fetch course offerings');
      }
      const raw: any = await response.json();
      if (Array.isArray(raw)) {
        const data: CourseOffering[] = raw.map((o: any) => ({
          id: o.id,
          programId: o.program_id ?? o.programId ?? programId,
          name: o.name ?? `${new Date(o.start_date ?? o.startDate).toLocaleDateString()} → ${new Date(o.end_date ?? o.endDate).toLocaleDateString()}`,
          startDate: o.start_date ?? o.startDate,
          endDate: o.end_date ?? o.endDate,
          maxEnrolments: o.max_enrolments ?? o.maxEnrolments,
          currentEnrolments: o.current_enrolments ?? o.currentEnrolments,
          status: o.status,
        }));
        return { data };
      }
      return raw as CourseOfferingsResponse;
    },
    enabled: !!programId,
    staleTime: 2 * 60 * 1000, // 2 minutes (more dynamic)
    gcTime: 5 * 60 * 1000,
  });
};

// Hook for fetching subjects for a program
export const useProgramSubjects = (programId: string) => {
  return useQuery<ProgramSubjectsResponse>({
    queryKey: ['program-subjects', programId],
    queryFn: async () => {
      const response = await fetch(`${FUNCTIONS_URL}/programs/${programId}/subjects`, { headers: getFunctionHeaders() });
      if (!response.ok) {
        throw new Error('Failed to fetch program subjects');
      }
      const raw: any = await response.json();
      if (Array.isArray(raw)) {
        const data: Subject[] = raw.map((s: any) => ({
          id: s.subject_id ?? s.id,
          name: s.subject_name ?? s.name ?? '',
          code: s.subject_identifier ?? s.code ?? '',
          description: s.description ?? undefined,
          isCore: (s.unit_type ?? s.unitType) === 'Core',
          credits: s.credits ?? undefined,
        }));
        return { data };
      }
      return raw as ProgramSubjectsResponse;
    },
    enabled: !!programId,
    staleTime: 10 * 60 * 1000, // 10 minutes (subjects don't change often)
    gcTime: 30 * 60 * 1000,
  });
};

// Helper functions for data transformation
export const transformProgramsForSelect = (data: ProgramsResponse | undefined) => {
  if (!data?.data) return [];
  
  return data.data.map(program => ({
    value: program.id,
    label: `${program.programCode} - ${program.name}`,
    description: program.description,
    programCode: program.programCode,
  }));
};

export const transformCourseOfferingsForSelect = (data: CourseOfferingsResponse | undefined) => {
  if (!data?.data) return [];
  
  return data.data.map(offering => ({
    value: offering.id,
    label: `${offering.name} (${new Date(offering.startDate).toLocaleDateString()})`,
    description: `Start: ${new Date(offering.startDate).toLocaleDateString()}, End: ${new Date(offering.endDate).toLocaleDateString()}`,
    startDate: offering.startDate,
    endDate: offering.endDate,
    maxEnrolments: offering.maxEnrolments,
    currentEnrolments: offering.currentEnrolments,
    status: offering.status,
  }));
};

export const transformSubjectsForSelection = (data: ProgramSubjectsResponse | undefined) => {
  if (!data?.data) return { core: [], electives: [] };
  
  const core = data.data
    .filter(subject => subject.isCore)
    .map(subject => ({
      value: subject.id,
      label: `${subject.code} - ${subject.name}`,
      description: subject.description,
      credits: subject.credits,
    }));
  
  const electives = data.data
    .filter(subject => !subject.isCore)
    .map(subject => ({
      value: subject.id,
      label: `${subject.code} - ${subject.name}`,
      description: subject.description,
      credits: subject.credits,
    }));
  
  return { core, electives };
};
