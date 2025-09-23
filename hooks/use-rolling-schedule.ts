import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FUNCTIONS_URL, getFunctionHeaders } from '@/lib/functions';

export type CatchupMode = 'SequentialNextTerm' | 'ParallelNextTerm';

export interface ProgramScheduleUnit {
  id?: string;
  schedule_id?: string;
  subject_id: string;
  order_index: number;
  duration_days: number;
  subject_name?: string;
  subject_identifier?: string;
}

export interface ProgramSchedule {
  id: string;
  program_id: string;
  name: string;
  cycle_anchor_date: string; // YYYY-MM-DD
  timezone: string;
  units: ProgramScheduleUnit[];
  created_at?: string;
  updated_at?: string;
}

export interface ProgramScheduleUpsert {
  name?: string;
  cycleAnchorDate: string; // YYYY-MM-DD
  timezone?: string;
  units: Array<{ subjectId: string; orderIndex: number; durationDays: number }>;
}

export interface RollingSchedulePreviewWindow {
  term_index: number;
  subject_id: string;
  subject_name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

export interface RollingSchedulePreview {
  cycle_anchor_date: string;
  timezone: string;
  cycles: number;
  windows: RollingSchedulePreviewWindow[];
}

export const useProgramRollingSchedule = (programId?: string) => {
  return useQuery<ProgramSchedule>({
    queryKey: ['rolling-schedule', programId],
    enabled: !!programId,
    queryFn: async () => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${programId}/rolling-schedule`, { headers: getFunctionHeaders() });
      if (!res.ok) throw new Error('Failed to fetch rolling schedule');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useValidateProgramRollingSchedule = () => {
  return useMutation({
    mutationFn: async (payload: { programId: string; data: ProgramScheduleUpsert }) => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${payload.programId}/rolling-schedule/validate`, {
        method: 'POST',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ isValid: boolean; errors: Array<{ field: string; message: string }>; warnings: string[] }>;
    },
  });
};

export const useUpsertProgramRollingSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { programId: string; data: ProgramScheduleUpsert }) => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${payload.programId}/rolling-schedule`, {
        method: 'PUT',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<ProgramSchedule>;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['rolling-schedule', vars.programId] });
      qc.invalidateQueries({ queryKey: ['rolling-schedule-preview', vars.programId] });
    },
  });
};

export const useSchedulePreview = () => {
  return useMutation({
    mutationFn: async (payload: { programId: string; cycles?: number; requestedStartDate?: string; catchupMode?: CatchupMode }) => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${payload.programId}/rolling-schedule/preview`, {
        method: 'POST',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycles: payload.cycles ?? 2, requestedStartDate: payload.requestedStartDate, catchupMode: payload.catchupMode }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<RollingSchedulePreview>;
    },
  });
};

export const useDeriveCatchup = () => {
  return useMutation({
    mutationFn: async (payload: { programId: string; startUnitId: string; catchupMode?: CatchupMode }) => {
      const res = await fetch(`${FUNCTIONS_URL}/course-plans/programs/${payload.programId}/derive-catchup`, {
        method: 'POST',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ startUnitId: payload.startUnitId, catchupMode: payload.catchupMode ?? 'SequentialNextTerm' }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ catchupUnits: Array<{ subjectId: string; targetTermIndex: number; startDate: string; endDate: string }> }>;
    },
  });
};


