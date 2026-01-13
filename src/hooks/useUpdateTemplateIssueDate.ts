import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export type UpdateTemplateIssueDateInput = {
  templateId: string;
  offsetDays: number;
};

export type UpdateTemplateIssueDateResponse = {
  success: boolean;
  invoicesUpdated?: number;
  message?: string;
};

/**
 * useUpdateTemplateIssueDate
 *
 * Updates a payment plan template's issue_date_offset_days and
 * recalculates issue dates for all affected SCHEDULED invoices
 */
export const useUpdateTemplateIssueDate = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateTemplateIssueDateResponse,
    Error,
    UpdateTemplateIssueDateInput
  >({
    mutationFn: async (input) => {
      const response = await fetch(
        `/api/financial/templates/${input.templateId}/issue-date`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            offsetDays: input.offsetDays,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update issue date');
      }

      return await response.json();
    },
    onSuccess: async (data) => {
      if (data.invoicesUpdated && data.invoicesUpdated > 0) {
        toast.success(
          `Issue date offset updated. ${data.invoicesUpdated} invoice(s) recalculated.`
        );
      } else {
        toast.success('Issue date offset updated');
      }
      await queryClient.invalidateQueries({
        queryKey: ['payment-plan-templates'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['invoices'],
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update issue date offset');
    },
  });
};
