import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type GenerateParams = { applicationId: string };

export const useGenerateOfferLetter = () => {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId }: GenerateParams) => {
      const { data, error } = await client.functions.invoke(
        'generate-offer-letter',
        {
          body: { applicationId },
        }
      );
      if (error) throw new Error(error.message);
      return data as { filePath: string; signedUrl: string };
    },
    onSuccess: (_, { applicationId }) => {
      queryClient.invalidateQueries({
        queryKey: ['application-files', applicationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['offer-letters', applicationId],
      });
    },
  });
};

export const useGetOfferLetters = (applicationId?: string) => {
  return useQuery({
    queryKey: ['offer-letters', applicationId],
    enabled: Boolean(applicationId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('offer_letters')
        .select('*')
        .eq('application_id', applicationId!)
        .order('generated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
