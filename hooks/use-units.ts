import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FUNCTIONS_URL, getFunctionHeaders } from '@/lib/functions';

// =============================================================================
// UNITS MANAGEMENT HOOKS
// For managing Units of Competency (Subjects)
// =============================================================================

interface Unit {
  id: string;
  subject_identifier: string;
  subject_name: string;
  status: 'Current' | 'Superseded' | 'Archived';
  tga_url?: string;
  created_at: string;
  updated_at: string;
}

interface UnitsResponse {
  data: Unit[];
}

interface UnitCreateData {
  subject_identifier: string;
  subject_name: string;
  status?: 'Current' | 'Superseded' | 'Archived';
  tga_url?: string;
}

interface UnitUpdateData {
  subject_name?: string;
  status?: 'Current' | 'Superseded' | 'Archived';
  tga_url?: string;
}

// Hook for fetching all units with optional filtering
export const useUnits = (params?: {
  search?: string;
  status?: 'Current' | 'Superseded' | 'Archived';
  unit_type?: 'Core' | 'Elective';
}) => {
  return useQuery<UnitsResponse>({
    queryKey: ['units', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.status) searchParams.append('status', params.status);
      if (params?.unit_type) searchParams.append('unit_type', params.unit_type);

      const url = `${FUNCTIONS_URL}/units${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await fetch(url, { headers: getFunctionHeaders() });
      
      if (!response.ok) {
        throw new Error('Failed to fetch units');
      }
      
      const raw: unknown = await response.json();
      if (Array.isArray(raw)) {
        return { data: raw };
      }
      return raw as UnitsResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for fetching a specific unit
export const useUnit = (unitId: string) => {
  return useQuery<Unit>({
    queryKey: ['unit', unitId],
    queryFn: async () => {
      const response = await fetch(`${FUNCTIONS_URL}/units/${unitId}`, { headers: getFunctionHeaders() });
      if (!response.ok) {
        throw new Error('Failed to fetch unit');
      }
      return response.json();
    },
    enabled: !!unitId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Hook for creating a new unit
export const useCreateUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (unitData: UnitCreateData) => {
      const response = await fetch(`${FUNCTIONS_URL}/units`, {
        method: 'POST',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(unitData),
      });
      if (!response.ok) {
        throw new Error('Failed to create unit');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });
};

// Hook for updating a unit
export const useUpdateUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UnitUpdateData }) => {
      const response = await fetch(`${FUNCTIONS_URL}/units/${id}`, {
        method: 'PUT',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update unit');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });
};

// Helper functions for data transformation
export const transformUnitsForSelect = (data: UnitsResponse | undefined) => {
  if (!data?.data) return [];
  
  return data.data.map(unit => ({
    value: unit.id,
    label: `${unit.subject_identifier} - ${unit.subject_name}`,
    description: unit.subject_identifier,
    status: unit.status,
  }));
};

export const transformUnitsForTable = (data: UnitsResponse | undefined) => {
  if (!data?.data) return [];
  
  return data.data.map(unit => ({
    id: unit.id,
    identifier: unit.subject_identifier,
    name: unit.subject_name,
    status: unit.status,
    tga_url: unit.tga_url,
    created_at: unit.created_at,
    updated_at: unit.updated_at,
  }));
};

export type { Unit, UnitCreateData, UnitUpdateData };
