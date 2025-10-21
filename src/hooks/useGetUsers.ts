import { useQuery } from '@tanstack/react-query';
import { Tables } from '@/database.types';

type UserWithAuthData = Tables<'profiles'> & {
  email?: string;
  created_at?: string;
};

/**
 * Fetch list of users (profiles) with auth data.
 */
export const useGetUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<UserWithAuthData[]> => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? 'Failed to fetch users');
      }
      return response.json();
    },
  });
};
