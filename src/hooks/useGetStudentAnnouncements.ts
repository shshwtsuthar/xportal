import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Announcement with read receipt status for student portal
 */
export type StudentAnnouncement = Tables<'announcements'> & {
  is_read: boolean;
  read_at: string | null;
};

/**
 * Fetch announcements for a specific student.
 * Only returns announcements where the student is a recipient, status is SENT, and not expired.
 * @param studentId The student UUID
 */
export const useGetStudentAnnouncements = (studentId: string | null) => {
  return useQuery({
    queryKey: ['student-announcements', studentId],
    queryFn: async (): Promise<StudentAnnouncement[]> => {
      if (!studentId) {
        return [];
      }

      const supabase = createClient();

      // Get current date for expiry check
      const today = new Date().toISOString().split('T')[0];

      // Fetch announcement recipients for this student
      const { data: recipients, error: recipientsError } = await supabase
        .from('announcement_recipients')
        .select('announcement_id')
        .eq('recipient_type', 'student')
        .eq('recipient_id', studentId);

      if (recipientsError) {
        throw new Error(recipientsError.message);
      }

      if (!recipients || recipients.length === 0) {
        return [];
      }

      const announcementIds = recipients.map((r) => r.announcement_id);

      // Fetch announcements that are SENT
      const { data: announcements, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .in('id', announcementIds)
        .eq('status', 'SENT')
        .order('created_at', { ascending: false })
        .limit(20); // Limit to most recent 20

      if (announcementsError) {
        throw new Error(announcementsError.message);
      }

      // Filter out expired announcements client-side
      const validAnnouncements = (announcements ?? []).filter(
        (announcement) => {
          if (!announcement.expiry_date) {
            return true; // No expiry date, always valid
          }
          const expiryDate = new Date(announcement.expiry_date);
          const todayDate = new Date(today);
          return expiryDate >= todayDate; // Not expired
        }
      );

      // Fetch read receipts for this student
      const { data: readReceipts, error: readReceiptsError } = await supabase
        .from('announcement_read_receipts')
        .select('announcement_id, read_at')
        .eq('recipient_type', 'student')
        .eq('recipient_id', studentId)
        .in('announcement_id', announcementIds);

      if (readReceiptsError) {
        throw new Error(readReceiptsError.message);
      }

      // Create a map of announcement_id -> read_at
      const readReceiptMap = new Map<string, string>(
        readReceipts?.map((rr) => [rr.announcement_id, rr.read_at]) ?? []
      );

      // Combine announcements with read status
      const announcementsWithReadStatus: StudentAnnouncement[] =
        validAnnouncements.map((announcement) => {
          const readAt = readReceiptMap.get(announcement.id);
          return {
            ...announcement,
            is_read: !!readAt,
            read_at: readAt || null,
          };
        });

      return announcementsWithReadStatus;
    },
    enabled: !!studentId,
  });
};
