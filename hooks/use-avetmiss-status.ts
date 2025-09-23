/**
 * AVETMISS Status Hook
 * 
 * React Query hook for fetching and managing AVETMISS compliance status
 * with automatic refresh and error handling.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { checkAVETMISSStatus, checkOrganisationStatus, checkLocationsStatus } from '@/lib/services/avetmiss-status-service';
import { NATFileStatus } from '@/src/types/compliance-types';

/**
 * Hook for fetching both NAT00010 and NAT00020 status
 */
export const useAvetmissStatus = () => {
  return useQuery({
    queryKey: ['avetmiss-status'],
    queryFn: checkAVETMISSStatus,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

/**
 * Hook for fetching only NAT00010 (Organisation) status
 */
export const useOrganisationStatus = () => {
  return useQuery({
    queryKey: ['avetmiss-status', 'NAT00010'],
    queryFn: checkOrganisationStatus,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

/**
 * Hook for fetching only NAT00020 (Locations) status
 */
export const useLocationsStatus = () => {
  return useQuery({
    queryKey: ['avetmiss-status', 'NAT00020'],
    queryFn: checkLocationsStatus,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

/**
 * Hook for manual status refresh
 */
export const useAvetmissStatusRefresh = () => {
  const queryClient = useQueryClient();
  
  const refreshStatus = () => {
    queryClient.invalidateQueries({
      queryKey: ['avetmiss-status']
    });
  };
  
  const refreshOrganisationStatus = () => {
    queryClient.invalidateQueries({
      queryKey: ['avetmiss-status', 'NAT00010']
    });
  };
  
  const refreshLocationsStatus = () => {
    queryClient.invalidateQueries({
      queryKey: ['avetmiss-status', 'NAT00020']
    });
  };
  
  return {
    refreshStatus,
    refreshOrganisationStatus,
    refreshLocationsStatus
  };
};

// Re-export types for convenience
export type { NATFileStatus };
