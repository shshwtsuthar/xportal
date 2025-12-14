import { useQuery } from '@tanstack/react-query';
import { Tables } from '@/database.types';

type TrainerWithAuthData = Tables<'profiles'> & {
  email?: string;
  created_at?: string;
};

/**
 * Fetch list of trainers (profiles with TRAINER role) with auth data.
 */
export const useGetTrainersForTable = () => {
  return useQuery({
    queryKey: ['trainers'],
    queryFn: async (): Promise<TrainerWithAuthData[]> => {
      const response = await fetch('/api/trainers');
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? 'Failed to fetch trainers');
      }
      return response.json();
    },
  });
};
