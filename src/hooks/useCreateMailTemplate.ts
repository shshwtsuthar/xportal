import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tables } from '@/database.types';
import { createClient } from '@/lib/supabase/client';

export type CreateMailTemplateInput = {
  name: string;
  subject: string;
  html_body: string;
};

/**
 * useCreateMailTemplate
 *
 * TanStack Query mutation hook that persists a new mail template (name + subject + body)
 * for the current RTO. Automatically records the creator profile and invalidates
 * cached template queries on success.
 *
 * @returns Mutation object with mutate / mutateAsync helpers
 */
export const useCreateMailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation<Tables<'mail_templates'>, Error, CreateMailTemplateInput>({
    mutationFn: async ({ name, subject, html_body }) => {
      const supabase = createClient();

      const trimmedName = name.trim();
      const trimmedSubject = subject.trim();
      const cleanedHtml = html_body ?? '';

      if (!trimmedName) {
        throw new Error('Template name is required');
      }

      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) {
        throw new Error(
          'Unable to resolve current user. Please re-authenticate.'
        );
      }

      const rtoId = (
        userData.user?.app_metadata as Record<string, unknown> | undefined
      )?.rto_id as string | undefined;
      if (!rtoId) {
        throw new Error(
          'User RTO not found in metadata. Please contact your administrator.'
        );
      }

      const { data, error } = await supabase
        .from('mail_templates')
        .insert({
          name: trimmedName,
          subject: trimmedSubject,
          html_body: cleanedHtml,
          created_by: userData.user?.id ?? null,
          rto_id: rtoId,
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Tables<'mail_templates'>;
    },
    onSuccess: async () => {
      toast.success('Template saved');
      await queryClient.invalidateQueries({ queryKey: ['mail-templates'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save template');
    },
  });
};
