import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFunctionHeaders } from '@/lib/utils';
import type { components } from '@/src/types/api';

const BASE_URL = 'http://127.0.0.1:54321/functions/v1';

// Type definitions
type ApplicationSummary = components['schemas']['ApplicationSummary'];
type ApplicationListResponse = components['schemas']['ApplicationListResponse'];
type ApplicationStats = {
  totalApplications: number;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
  recentSubmissions: number;
  averageProcessingTime: number;
  completionRate: number;
};

// Query parameters interface
interface ListApplicationsParams {
  page?: number;
  limit?: number;
  search?: string;
}

// Generic function to fetch applications by status
const fetchApplicationsByStatus = async (
  status: 'drafts' | 'submitted' | 'approved',
  params: ListApplicationsParams = {}
): Promise<ApplicationListResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);

  const url = `${BASE_URL}/applications/${status}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getFunctionHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${status} applications: ${response.statusText}`);
  }

  return response.json();
};

// Function to fetch application statistics
const fetchApplicationStats = async (): Promise<ApplicationStats> => {
  const response = await fetch(`${BASE_URL}/applications/stats`, {
    method: 'GET',
    headers: getFunctionHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch application stats: ${response.statusText}`);
  }

  return response.json();
};

// Hook for draft applications
export const useDraftApplications = (params: ListApplicationsParams = {}) => {
  return useQuery({
    queryKey: ['applications', 'drafts', params],
    queryFn: () => fetchApplicationsByStatus('drafts', params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

// Hook for submitted applications
export const useSubmittedApplications = (params: ListApplicationsParams = {}) => {
  return useQuery({
    queryKey: ['applications', 'submitted', params],
    queryFn: () => fetchApplicationsByStatus('submitted', params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

// Hook for approved applications
export const useApprovedApplications = (params: ListApplicationsParams = {}) => {
  return useQuery({
    queryKey: ['applications', 'approved', params],
    queryFn: () => fetchApplicationsByStatus('approved', params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

// Hook for application statistics
export const useApplicationStats = () => {
  return useQuery({
    queryKey: ['applications', 'stats'],
    queryFn: fetchApplicationStats,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });
};

// Hook for single application by ID
export const useApplicationById = (applicationId: string | undefined) => {
  return useQuery({
    queryKey: ['applications', 'detail', applicationId],
    enabled: !!applicationId,
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/applications/${applicationId}`, {
        method: 'GET',
        headers: getFunctionHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch application: ${response.statusText}`);
      }

      return response.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

// Hook for all applications with status filtering
export const useAllApplications = (params: ListApplicationsParams & { status?: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' } = {}) => {
  return useQuery({
    queryKey: ['applications', 'all', params],
    queryFn: async (): Promise<ApplicationListResponse> => {
      const searchParams = new URLSearchParams();
      
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.search) searchParams.set('search', params.search);
      if (params.status) searchParams.set('status', params.status);

      const url = `${BASE_URL}/applications${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getFunctionHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch applications: ${response.statusText}`);
      }

      return response.json();
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

// Utility hook to invalidate all application queries
export const useInvalidateApplications = () => {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['applications'] });
  };

  const invalidateByStatus = (status: 'drafts' | 'submitted' | 'approved') => {
    queryClient.invalidateQueries({ queryKey: ['applications', status] });
  };

  const invalidateStats = () => {
    queryClient.invalidateQueries({ queryKey: ['applications', 'stats'] });
  };

  return {
    invalidateAll,
    invalidateByStatus,
    invalidateStats,
  };
};

// Hook for pagination utilities
export const useApplicationPagination = (data: ApplicationListResponse | undefined) => {
  const pagination = data?.pagination;
  
  return {
    currentPage: pagination?.page || 1,
    totalPages: pagination?.totalPages || 1,
    totalItems: pagination?.total || 0,
    itemsPerPage: pagination?.limit || 20,
    hasNext: pagination?.hasNext || false,
    hasPrevious: pagination?.hasPrevious || false,
    isEmpty: !data?.data || data.data.length === 0,
  };
};

// Hook for search functionality
export const useApplicationSearch = () => {
  const queryClient = useQueryClient();

  const search = (query: string, status?: 'drafts' | 'submitted' | 'approved') => {
    const searchParams: ListApplicationsParams = { search: query, page: 1, limit: 20 };
    
    if (status) {
      queryClient.prefetchQuery({
        queryKey: ['applications', status, searchParams],
        queryFn: () => fetchApplicationsByStatus(status, searchParams),
      });
    } else {
      queryClient.prefetchQuery({
        queryKey: ['applications', 'all', { ...searchParams, status: undefined }],
        queryFn: () => fetchApplicationsByStatus('drafts', searchParams), // This would need to be updated for all applications
      });
    }
  };

  const clearSearch = (status?: 'drafts' | 'submitted' | 'approved') => {
    const searchParams: ListApplicationsParams = { page: 1, limit: 20 };
    
    if (status) {
      queryClient.prefetchQuery({
        queryKey: ['applications', status, searchParams],
        queryFn: () => fetchApplicationsByStatus(status, searchParams),
      });
    }
  };

  return {
    search,
    clearSearch,
  };
};

// Export types for external use
export type {
  ApplicationSummary,
  ApplicationListResponse,
  ApplicationStats,
  ListApplicationsParams,
};
