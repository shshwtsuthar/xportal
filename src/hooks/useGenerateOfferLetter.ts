import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type GenerateParams = { applicationId: string };

/**
 * useGenerateOfferLetter
 * Generates an offer letter via the Supabase Edge Function and refreshes dependent queries.
 * @returns TanStack Query mutation for invoking the generate-offer-letter function.
 */
export const useGenerateOfferLetter = () => {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId }: GenerateParams) => {
      // Call Next.js API route (Node runtime) to avoid Deno/react-pdf issues
      const res = await fetch('/api/generate-offer-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      });
      if (!res.ok) {
        const msg =
          (await res.json().catch(() => ({ error: res.statusText })))?.error ||
          res.statusText;
        throw new Error(msg || 'Failed to generate offer letter');
      }
      const data = (await res.json()) as {
        filePath: string;
        signedUrl: string;
      };
      return data;
    },
    onSuccess: (_, { applicationId }) => {
      queryClient.invalidateQueries({
        queryKey: ['applications'],
      });
      queryClient.invalidateQueries({
        queryKey: ['application', applicationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['application-files', applicationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['offer-letters', applicationId],
      });
    },
  });
};

/**
 * useGetOfferLetters
 * Fetches generated offer letters for an application.
 * @param applicationId UUID of the application to list offer letters for.
 * @returns TanStack Query result with offer letter records.
 */
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
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
};
