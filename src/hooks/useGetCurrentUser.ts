import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type CurrentUser = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: Tables<'profiles'>['role'];
};

/**
 * Fetch current authenticated user's profile information including email, name, and role.
 * @returns TanStack Query result with current user data
 */
export const useGetCurrentUser = () => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async (): Promise<CurrentUser | null> => {
      const supabase = createClient();

      // Get authenticated user to retrieve email
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);

      const userId = userData.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const email = userData.user?.email;
      if (!email) throw new Error('User email not found');

      // Fetch user's profile to get first_name, last_name, and role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, role')
        .eq('id', userId)
        .single();

      if (profileError) throw new Error(profileError.message);
      if (!profile) throw new Error('Profile not found');

      return {
        id: userId,
        email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role,
      };
    },
  });
};
