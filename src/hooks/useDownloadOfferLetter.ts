import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * useDownloadOfferLetter
 * Fetches the latest offer letter for an application, downloads it, and converts it to a File object.
 * @param applicationId UUID of the application to fetch offer letter for.
 * @returns TanStack Query result with File object ready for attachment.
 */
export const useDownloadOfferLetter = (applicationId?: string) => {
  return useQuery({
    queryKey: ['download-offer-letter', applicationId],
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<File | null> => {
      if (!applicationId) return null;

      const supabase = createClient();

      // Fetch the latest offer letter
      const { data: offerLetters, error: offerErr } = await supabase
        .from('offer_letters')
        .select('*')
        .eq('application_id', applicationId)
        .order('generated_at', { ascending: false })
        .limit(1);

      if (offerErr) {
        throw new Error(`Failed to fetch offer letter: ${offerErr.message}`);
      }

      if (!offerLetters || offerLetters.length === 0) {
        return null;
      }

      const offerLetter = offerLetters[0];

      // Create signed URL for the file
      const { data: signedUrlData, error: urlErr } = await supabase.storage
        .from('applications')
        .createSignedUrl(offerLetter.file_path, 60 * 5); // 5 minutes expiry

      if (urlErr || !signedUrlData?.signedUrl) {
        throw new Error(
          `Failed to create signed URL: ${urlErr?.message || 'Unknown error'}`
        );
      }

      // Download the file
      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Extract filename from file_path (e.g., "uuid/offer_letters/offer-20240101-120000.pdf")
      const fileName =
        offerLetter.file_path.split('/').pop() || 'offer-letter.pdf';

      // Convert blob to File object
      const file = new File([blob], fileName, {
        type: 'application/pdf',
      });

      return file;
    },
  });
};
