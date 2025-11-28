import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Recipient with read receipt status
 */
export type AnnouncementRecipient = Tables<'announcement_recipients'> & {
  read_receipt?: Pick<Tables<'announcement_read_receipts'>, 'read_at'> | null;
  student?: Pick<
    Tables<'students'>,
    'id' | 'first_name' | 'last_name' | 'email'
  > | null;
  application?: Pick<
    Tables<'applications'>,
    'id' | 'first_name' | 'last_name' | 'email'
  > | null;
};

/**
 * Fetch recipients for a specific announcement.
 * @param announcementId The announcement ID
 */
export const useGetAnnouncementRecipients = (announcementId: string | null) => {
  return useQuery({
    queryKey: ['announcement-recipients', announcementId],
    queryFn: async (): Promise<AnnouncementRecipient[]> => {
      if (!announcementId) {
        return [];
      }

      const supabase = createClient();

      // Fetch recipients
      const { data: recipients, error: recipientsError } = await supabase
        .from('announcement_recipients')
        .select('*')
        .eq('announcement_id', announcementId)
        .order('created_at', { ascending: false });

      if (recipientsError) {
        throw new Error(recipientsError.message);
      }

      // Fetch student/application details and read receipts for each recipient
      const recipientsWithDetails = await Promise.all(
        (recipients ?? []).map(async (recipient) => {
          // Get read receipt
          const { data: readReceipt } = await supabase
            .from('announcement_read_receipts')
            .select('read_at')
            .eq('announcement_id', announcementId)
            .eq('recipient_type', recipient.recipient_type)
            .eq('recipient_id', recipient.recipient_id)
            .single();

          if (recipient.recipient_type === 'student') {
            const { data: student } = await supabase
              .from('students')
              .select('id, first_name, last_name, email')
              .eq('id', recipient.recipient_id)
              .single();

            return {
              ...recipient,
              read_receipt: readReceipt ?? null,
              student: student ?? null,
              application: null,
            };
          } else {
            const { data: application } = await supabase
              .from('applications')
              .select('id, first_name, last_name, email')
              .eq('id', recipient.recipient_id)
              .single();

            return {
              ...recipient,
              read_receipt: readReceipt ?? null,
              student: null,
              application: application ?? null,
            };
          }
        })
      );

      return recipientsWithDetails;
    },
    enabled: !!announcementId,
  });
};
