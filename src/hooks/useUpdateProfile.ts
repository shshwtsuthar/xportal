import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type UpdatePayload = {
  first_name?: string | null;
  last_name?: string | null;
  theme?: string | null;
};

/**
 * Update current user's profile information (first_name and last_name).
 * @returns TanStack Query mutation for updating profile
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdatePayload): Promise<Tables<'profiles'>> => {
      const supabase = createClient();

      // Get current authenticated user ID
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      const userId = userData.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // Clean up empty strings to null for optional fields
      const updateData = {
        first_name: payload.first_name || null,
        last_name: payload.last_name || null,
        theme: payload.theme || null,
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};
