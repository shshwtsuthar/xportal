import { useState, useMemo } from 'react';
import { 
  useDraftApplications, 
  useSubmittedApplications, 
  useApprovedApplications, 
  useApplicationStats,
  useAllApplications,
  useInvalidateApplications,
  useApplicationPagination,
  useApplicationSearch,
  type ListApplicationsParams,
  type ApplicationSummary,
} from './use-applications-status';
import { 
  useRejectApplication, 
  useApproveApplication, 
  useSubmitApplication,
  useBulkApplicationActions,
  type RejectApplicationPayload,
  type ApproveApplicationPayload,
} from './use-application-actions';

// Main hook that combines all application management functionality
export const useApplicationsManagement = () => {
  // State for current view and filters
  const [currentView, setCurrentView] = useState<'drafts' | 'submitted' | 'approved' | 'all'>('drafts');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Build query parameters
  const queryParams: ListApplicationsParams = useMemo(() => ({
    page: currentPage,
    limit: pageSize,
    search: searchQuery || undefined,
  }), [currentPage, pageSize, searchQuery]);

  // Fetch data based on current view
  const draftsQuery = useDraftApplications(queryParams);
  const submittedQuery = useSubmittedApplications(queryParams);
  const approvedQuery = useApprovedApplications(queryParams);
  const allQuery = useAllApplications(queryParams);
  const statsQuery = useApplicationStats();

  // Get current query based on view
  const currentQuery = useMemo(() => {
    switch (currentView) {
      case 'drafts': return draftsQuery;
      case 'submitted': return submittedQuery;
      case 'approved': return approvedQuery;
      case 'all': return allQuery;
      default: return draftsQuery;
    }
  }, [currentView, draftsQuery, submittedQuery, approvedQuery, allQuery]);

  // Pagination utilities
  const pagination = useApplicationPagination(currentQuery.data);

  // Search functionality
  const { search, clearSearch } = useApplicationSearch();

  // Invalidation utilities
  const { invalidateAll, invalidateByStatus, invalidateStats } = useInvalidateApplications();

  // Action mutations
  const rejectMutation = useRejectApplication();
  const approveMutation = useApproveApplication();
  const submitMutation = useSubmitApplication();
  const { bulkReject, bulkApprove } = useBulkApplicationActions();

  // Helper functions
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleViewChange = (view: 'drafts' | 'submitted' | 'approved' | 'all') => {
    setCurrentView(view);
    setCurrentPage(1); // Reset to first page when changing view
  };

  // Action handlers
  const handleRejectApplication = async (applicationId: string, reason: string) => {
    try {
      await rejectMutation.mutateAsync({ 
        applicationId, 
        payload: { reason } 
      });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reject application' 
      };
    }
  };

  const handleApproveApplication = async (applicationId: string, payload: ApproveApplicationPayload) => {
    try {
      await approveMutation.mutateAsync({ applicationId, payload });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to approve application' 
      };
    }
  };

  const handleSubmitApplication = async (applicationId: string) => {
    try {
      await submitMutation.mutateAsync(applicationId);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to submit application' 
      };
    }
  };

  const handleBulkReject = async (applicationIds: string[], reason: string) => {
    try {
      const result = await bulkReject.mutateAsync({ applicationIds, reason });
      return { 
        success: true, 
        successful: result.successful, 
        failed: result.failed 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reject applications' 
      };
    }
  };

  const handleBulkApprove = async (applicationIds: string[], payload: ApproveApplicationPayload) => {
    try {
      const result = await bulkApprove.mutateAsync({ applicationIds, payload });
      return { 
        success: true, 
        successful: result.successful, 
        failed: result.failed 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to approve applications' 
      };
    }
  };

  // Refresh data
  const refreshData = () => {
    invalidateAll();
  };

  const refreshStats = () => {
    invalidateStats();
  };

  // Computed values
  const applications = currentQuery.data?.data || [];
  const isLoading = currentQuery.isLoading;
  const isError = currentQuery.isError;
  const error = currentQuery.error;

  const stats = statsQuery.data;
  const isStatsLoading = statsQuery.isLoading;
  const isStatsError = statsQuery.isError;

  // Loading states for actions
  const isRejecting = rejectMutation.isPending;
  const isApproving = approveMutation.isPending;
  const isSubmitting = submitMutation.isPending;
  const isBulkProcessing = bulkReject.isPending || bulkApprove.isPending;

  return {
    // Data
    applications,
    stats,
    
    // Loading states
    isLoading,
    isError,
    error,
    isStatsLoading,
    isStatsError,
    
    // Action loading states
    isRejecting,
    isApproving,
    isSubmitting,
    isBulkProcessing,
    
    // Current state
    currentView,
    searchQuery,
    currentPage,
    pageSize,
    
    // Pagination
    pagination,
    
    // Handlers
    handleSearch,
    handleClearSearch,
    handlePageChange,
    handlePageSizeChange,
    handleViewChange,
    handleRejectApplication,
    handleApproveApplication,
    handleSubmitApplication,
    handleBulkReject,
    handleBulkApprove,
    refreshData,
    refreshStats,
    
    // Direct access to queries for advanced usage
    queries: {
      drafts: draftsQuery,
      submitted: submittedQuery,
      approved: approvedQuery,
      all: allQuery,
      stats: statsQuery,
    },
  };
};

// Hook for individual application management
export const useApplicationManagement = (applicationId: string) => {
  const rejectMutation = useRejectApplication();
  const approveMutation = useApproveApplication();
  const submitMutation = useSubmitApplication();
  const { invalidateAll } = useInvalidateApplications();

  const handleReject = async (reason: string) => {
    try {
      await rejectMutation.mutateAsync({ 
        applicationId, 
        payload: { reason } 
      });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reject application' 
      };
    }
  };

  const handleApprove = async (payload: ApproveApplicationPayload) => {
    try {
      await approveMutation.mutateAsync({ applicationId, payload });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to approve application' 
      };
    }
  };

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync(applicationId);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to submit application' 
      };
    }
  };

  const refresh = () => {
    invalidateAll();
  };

  return {
    handleReject,
    handleApprove,
    handleSubmit,
    refresh,
    isRejecting: rejectMutation.isPending,
    isApproving: approveMutation.isPending,
    isSubmitting: submitMutation.isPending,
  };
};

// Export types
export type {
  ListApplicationsParams,
  ApplicationSummary,
  RejectApplicationPayload,
  ApproveApplicationPayload,
};
