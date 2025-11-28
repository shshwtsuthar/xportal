import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables, TablesInsert } from '@/database.types';

/**
 * Mark an announcement as read for a student.
 * Creates a read receipt record if one doesn't already exist.
 */
export const useMarkAnnouncementAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      announcementId,
      studentId,
    }: {
      announcementId: string;
      studentId: string;
    }): Promise<Tables<'announcement_read_receipts'>> => {
      const supabase = createClient();

      // Get RTO ID from announcement record
      const { data: announcement, error: announcementError } = await supabase
        .from('announcements')
        .select('rto_id')
        .eq('id', announcementId)
        .single();

      if (announcementError || !announcement) {
        throw new Error('Announcement not found');
      }

      // Check if read receipt already exists
      const { data: existingReceipt } = await supabase
        .from('announcement_read_receipts')
        .select('*')
        .eq('announcement_id', announcementId)
        .eq('recipient_type', 'student')
        .eq('recipient_id', studentId)
        .maybeSingle();

      if (existingReceipt) {
        // Already read, return existing receipt
        return existingReceipt;
      }

      // Create new read receipt (rto_id will be set by trigger, but we provide it for type safety)
      const readReceiptData: TablesInsert<'announcement_read_receipts'> = {
        announcement_id: announcementId,
        recipient_type: 'student',
        recipient_id: studentId,
        rto_id: announcement.rto_id,
        read_at: new Date().toISOString(),
      };

      const { data: readReceipt, error: readReceiptError } = await supabase
        .from('announcement_read_receipts')
        .insert(readReceiptData)
        .select('*')
        .single();

      if (readReceiptError) {
        // If it's a duplicate key error, fetch the existing receipt
        if (readReceiptError.code === '23505') {
          // Unique constraint violation - receipt already exists (race condition)
          const { data: existingReceipt } = await supabase
            .from('announcement_read_receipts')
            .select('*')
            .eq('announcement_id', announcementId)
            .eq('recipient_type', 'student')
            .eq('recipient_id', studentId)
            .maybeSingle();

          if (existingReceipt) {
            return existingReceipt;
          }
        }
        throw new Error(
          `Failed to mark announcement as read: ${readReceiptError.message}`
        );
      }

      if (!readReceipt) {
        throw new Error('Failed to create read receipt');
      }

      return readReceipt;
    },
    onSuccess: (_, variables) => {
      // Invalidate student announcements query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ['student-announcements', variables.studentId],
      });
    },
  });
};
