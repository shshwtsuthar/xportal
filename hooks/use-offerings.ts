import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getFunctionHeaders, FUNCTIONS_URL } from '@/lib/functions';

export interface OfferingInput {
  programId: string;
  isRolling?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  status?: 'Scheduled' | 'Active' | 'Completed' | 'Cancelled';
  defaultPlanId?: string | null;
}

export const useOfferings = (programId: string | undefined) => {
  return useQuery<any[]>({
    queryKey: ['offerings', programId],
    enabled: !!programId,
    queryFn: async () => {
      const res = await fetch(`${FUNCTIONS_URL}/programs/${programId}/offerings`, {
        headers: getFunctionHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load offerings');
      return res.json();
    },
  });
};

export const useCreateOffering = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: OfferingInput) => {
      const res = await fetch(`${FUNCTIONS_URL}/course-offerings`, {
        method: 'POST',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['offerings', vars.programId] }),
  });
};

export const useUpdateOffering = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { offeringId: string; programId: string; data: Partial<OfferingInput> }) => {
      const res = await fetch(`${FUNCTIONS_URL}/course-offerings/${payload.offeringId}`, {
        method: 'PUT',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['offerings', vars.programId] }),
  });
};

export const useDeleteOffering = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { offeringId: string; programId: string }) => {
      const res = await fetch(`${FUNCTIONS_URL}/course-offerings/${payload.offeringId}`, {
        method: 'DELETE',
        headers: getFunctionHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      return true;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['offerings', vars.programId] }),
  });
};


