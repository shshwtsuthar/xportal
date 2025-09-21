import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getFunctionHeaders } from '@/lib/utils';

const BASE_URL = 'http://127.0.0.1:54321/functions/v1';

// Type definitions
interface RejectApplicationPayload {
  reason: string;
}

interface ApproveApplicationPayload {
  tuitionFeeSnapshot: number;
  agentCommissionRateSnapshot: number;
  action?: string;
  notes?: string;
}

// Hook for rejecting applications
export const useRejectApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, payload }: { applicationId: string; payload: RejectApplicationPayload }) => {
      const response = await fetch(`${BASE_URL}/applications/${applicationId}/reject`, {
        method: 'POST',
        headers: {
          ...getFunctionHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to reject application: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (_, { applicationId }) => {
      // Invalidate all application queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
};

// Hook for approving applications
export const useApproveApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, payload }: { applicationId: string; payload: ApproveApplicationPayload }) => {
      const response = await fetch(`${BASE_URL}/applications/${applicationId}/approve`, {
        method: 'POST',
        headers: {
          ...getFunctionHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to approve application: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (_, { applicationId }) => {
      // Invalidate all application queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
};

// Hook for submitting applications (if not already in use-application-api.ts)
export const useSubmitApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await fetch(`${BASE_URL}/applications/${applicationId}/submit`, {
        method: 'POST',
        headers: getFunctionHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to submit application: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (_, applicationId) => {
      // Invalidate all application queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
};

// Hook for accepting applications
export const useAcceptApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await fetch(`${BASE_URL}/applications/${applicationId}/accept`, {
        method: 'POST',
        headers: getFunctionHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to accept application: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (_, applicationId) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
};

// Hook for sending offer (Resend) and marking AwaitingPayment on success
export const useSendOffer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await fetch(`${BASE_URL}/applications/${applicationId}/send-offer`, {
        method: 'POST',
        headers: getFunctionHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to send offer: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (_, applicationId) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
};

// Hook for sending offer letter email only (no status change)
export const useSendOfferLetterEmail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await fetch(`${BASE_URL}/applications/${applicationId}/send-offer-email`, {
        method: 'POST',
        headers: getFunctionHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to send offer letter email: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (_, applicationId) => {
      // Only invalidate queries to refresh the UI, but no status change
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
};

// Hook for marking AwaitingPayment without sending email
export const useMarkAwaitingPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await fetch(`${BASE_URL}/applications/${applicationId}/mark-awaiting`, {
        method: 'POST',
        headers: getFunctionHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to mark awaiting payment: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (_, applicationId) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
};

// Hook for generating offer letters
export const useGenerateOfferLetter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await fetch(`${BASE_URL}/applications/${applicationId}/offer-letter`, {
        method: 'POST',
        headers: getFunctionHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate offer letter');
      }
      return response.json();
    },
    onSuccess: (_, applicationId) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
};

// Helper to download latest offer artifact
export const downloadLatestOffer = async (applicationId: string) => {
  const res = await fetch(`${BASE_URL}/applications/${applicationId}/offer-latest`, {
    method: 'GET',
    headers: getFunctionHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to download offer letter');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'offer';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// Hook for bulk operations
export const useBulkApplicationActions = () => {
  const queryClient = useQueryClient();

  const bulkReject = useMutation({
    mutationFn: async ({ applicationIds, reason }: { applicationIds: string[]; reason: string }) => {
      const results = await Promise.allSettled(
        applicationIds.map(id =>
          fetch(`${BASE_URL}/applications/${id}/reject`, {
            method: 'POST',
            headers: {
              ...getFunctionHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason }),
          }).then(res => {
            if (!res.ok) throw new Error(`Failed to reject application ${id}`);
            return res.json();
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed, results };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const bulkApprove = useMutation({
    mutationFn: async ({ 
      applicationIds, 
      payload 
    }: { 
      applicationIds: string[]; 
      payload: ApproveApplicationPayload 
    }) => {
      const results = await Promise.allSettled(
        applicationIds.map(id =>
          fetch(`${BASE_URL}/applications/${id}/approve`, {
            method: 'POST',
            headers: {
              ...getFunctionHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }).then(res => {
            if (!res.ok) throw new Error(`Failed to approve application ${id}`);
            return res.json();
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed, results };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  return {
    bulkReject,
    bulkApprove,
  };
};

// Hook for deleting applications
export const useDeleteApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await fetch(`${BASE_URL}/applications/${applicationId}`, {
        method: 'DELETE',
        headers: getFunctionHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete application: ${response.statusText}`);
      }

      return null; // DELETE returns 204 No Content
    },
    onSuccess: (_, applicationId) => {
      // Invalidate all application queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
};

// Export types
export type {
  RejectApplicationPayload,
  ApproveApplicationPayload,
};
