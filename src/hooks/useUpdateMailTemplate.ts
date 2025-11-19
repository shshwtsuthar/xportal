import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type UpdateMailTemplatePayload = {
  id: string;
  name?: string;
  subject?: string;
  html_body?: string;
};

/**
 * useUpdateMailTemplate
 *
 * TanStack Query mutation hook that updates an existing mail template.
 * Invalidates template queries on success to refresh the UI.
 *
 * @returns Mutation object with mutate / mutateAsync helpers
 */
export const useUpdateMailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Tables<'mail_templates'>,
    Error,
    UpdateMailTemplatePayload
  >({
    mutationFn: async ({ id, name, subject, html_body }) => {
      const supabase = createClient();

      const updateData: Partial<{
        name: string;
        subject: string;
        html_body: string;
      }> = {};

      if (name !== undefined) {
        updateData.name = name.trim();
      }
      if (subject !== undefined) {
        updateData.subject = subject.trim();
      }
      if (html_body !== undefined) {
        updateData.html_body = html_body;
      }

      const { data, error } = await supabase
        .from('mail_templates')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Tables<'mail_templates'>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mail-templates'] });
    },
    onError: (error) => {
      // Error toast is handled by the component
      console.error('Failed to update template:', error);
    },
  });
};
