import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type DisabilityPayload = {
  application_id: string;
  disability_type_id: string;
};

type PriorEducationPayload = {
  application_id: string;
  prior_achievement_id: string;
  recognition_type?: string;
};

/**
 * Create a disability record for an application
 */
export const useCreateDisability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: DisabilityPayload
    ): Promise<Tables<'application_disabilities'>> => {
      const supabase = createClient();

      // Get the RTO ID from the user's session
      const { data: sessionData } = await supabase.auth.getSession();
      const rtoId = (
        sessionData.session?.user?.app_metadata as Record<string, unknown>
      )?.rto_id as string;
      if (!rtoId) {
        throw new Error('User RTO not found in session metadata.');
      }

      const { data, error } = await supabase
        .from('application_disabilities')
        .insert({ ...payload, rto_id: rtoId })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['application_disabilities', variables.application_id],
      });
    },
  });
};

/**
 * Create a prior education record for an application
 */
export const useCreatePriorEducation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: PriorEducationPayload
    ): Promise<Tables<'application_prior_education'>> => {
      const supabase = createClient();

      // Get the RTO ID from the user's session
      const { data: sessionData } = await supabase.auth.getSession();
      const rtoId = (
        sessionData.session?.user?.app_metadata as Record<string, unknown>
      )?.rto_id as string;
      if (!rtoId) {
        throw new Error('User RTO not found in session metadata.');
      }

      const { data, error } = await supabase
        .from('application_prior_education')
        .insert({
          ...payload,
          rto_id: rtoId,
          recognition_type: payload.recognition_type || null,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['application_prior_education', variables.application_id],
      });
    },
  });
};

/**
 * Delete a disability record
 */
export const useDeleteDisability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const supabase = createClient();
      const { error } = await supabase
        .from('application_disabilities')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application_disabilities'] });
    },
  });
};

/**
 * Delete a prior education record
 */
export const useDeletePriorEducation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const supabase = createClient();
      const { error } = await supabase
        .from('application_prior_education')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['application_prior_education'],
      });
    },
  });
};
