import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables, Enums } from '@/database.types';

/**
 * Announcement with related data
 */
export type AnnouncementWithDetails = Tables<'announcements'> & {
  created_by_profile?: Pick<
    Tables<'profiles'>,
    'id' | 'first_name' | 'last_name'
  > | null;
  recipient_count?: number;
  read_count?: number;
};

/**
 * Fetch announcements with optional filters.
 * @param filters Optional filters for status, priority, tags
 */
export const useGetAnnouncements = (filters?: {
  statuses?: string[];
  priorities?: string[];
  tags?: string[];
}) => {
  return useQuery({
    queryKey: ['announcements', filters ? JSON.stringify(filters) : 'all'],
    queryFn: async (): Promise<AnnouncementWithDetails[]> => {
      const supabase = createClient();

      let query = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.statuses?.length) {
        query = query.in(
          'status',
          filters.statuses as Enums<'announcement_status'>[]
        );
      }

      if (filters?.priorities?.length) {
        query = query.in(
          'priority',
          filters.priorities as Enums<'announcement_priority'>[]
        );
      }

      if (filters?.tags?.length) {
        // Filter by tags (array contains)
        query = query.contains('tags', filters.tags);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      // Get recipient counts, read counts, and profile data for each announcement
      const announcementsWithCounts = await Promise.all(
        (data ?? []).map(async (announcement) => {
          // Get profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('id', announcement.created_by)
            .single();

          // Get recipient count
          const { count: recipientCount } = await supabase
            .from('announcement_recipients')
            .select('*', { count: 'exact', head: true })
            .eq('announcement_id', announcement.id);

          // Get read receipt count
          const { count: readCount } = await supabase
            .from('announcement_read_receipts')
            .select('*', { count: 'exact', head: true })
            .eq('announcement_id', announcement.id);

          return {
            ...announcement,
            created_by_profile: profile ?? null,
            recipient_count: recipientCount ?? 0,
            read_count: readCount ?? 0,
          };
        })
      );

      return announcementsWithCounts;
    },
  });
};
