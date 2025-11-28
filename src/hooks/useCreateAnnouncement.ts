import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables, TablesInsert, Json } from '@/database.types';
import { computeRecipients } from '@/lib/announcementRecipients';
import type {
  AnnouncementFilterCriteria,
  AnnouncementMedium,
} from '@/types/announcementFilters';

/**
 * Payload for creating an announcement
 */
export interface CreateAnnouncementPayload {
  subject: string;
  body: string;
  recipientFilterCriteria: AnnouncementFilterCriteria;
  mediumSelection: AnnouncementMedium[];
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  tags?: string[];
  expiryDate?: string;
  attachments?: File[];
}

/**
 * Create a new announcement with recipients and attachments.
 */
export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: CreateAnnouncementPayload
    ): Promise<Tables<'announcements'>> => {
      const supabase = createClient();

      // Get user and RTO ID
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const rtoId = (user.app_metadata as Record<string, unknown> | undefined)
        ?.rto_id as string | undefined;

      if (!rtoId) {
        throw new Error('RTO ID not found in user metadata');
      }

      // Get profile ID (created_by)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Profile not found');
      }

      // Compute recipients based on filter criteria
      const { studentIds, applicationIds } = await computeRecipients(
        payload.recipientFilterCriteria,
        rtoId
      );

      // Create announcement record - instantly send (status = SENT)
      const now = new Date().toISOString();
      const announcementData: TablesInsert<'announcements'> = {
        rto_id: rtoId,
        created_by: profile.id,
        subject: payload.subject,
        body: payload.body,
        recipient_filter_criteria:
          payload.recipientFilterCriteria as unknown as Json,
        medium_selection: payload.mediumSelection as unknown as Json,
        status: 'SENT',
        scheduled_send_at: null,
        sent_at: now,
        priority: payload.priority || 'NORMAL',
        tags: payload.tags || [],
        expiry_date: payload.expiryDate || null,
      };

      const { data: announcement, error: announcementError } = await supabase
        .from('announcements')
        .insert(announcementData)
        .select('*')
        .single();

      if (announcementError || !announcement) {
        throw new Error(
          announcementError?.message || 'Failed to create announcement'
        );
      }

      // Create recipient snapshot records
      const recipientInserts: TablesInsert<'announcement_recipients'>[] = [
        ...studentIds.map((studentId) => ({
          announcement_id: announcement.id,
          recipient_type: 'student' as const,
          recipient_id: studentId,
          rto_id: rtoId,
        })),
        ...applicationIds.map((applicationId) => ({
          announcement_id: announcement.id,
          recipient_type: 'application' as const,
          recipient_id: applicationId,
          rto_id: rtoId,
        })),
      ];

      if (recipientInserts.length > 0) {
        const { error: recipientsError } = await supabase
          .from('announcement_recipients')
          .insert(recipientInserts);

        if (recipientsError) {
          // Clean up announcement if recipient insert fails
          await supabase
            .from('announcements')
            .delete()
            .eq('id', announcement.id);
          throw new Error(
            `Failed to create recipient snapshot: ${recipientsError.message}`
          );
        }
      }

      // Upload attachments if provided
      if (payload.attachments && payload.attachments.length > 0) {
        const attachmentInserts: TablesInsert<'announcement_attachments'>[] =
          [];

        for (const file of payload.attachments) {
          const filePath = `${announcement.id}/${file.name}`;

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('announcement-attachments')
            .upload(filePath, file, { upsert: false });

          if (uploadError) {
            // Clean up on error
            await supabase
              .from('announcements')
              .delete()
              .eq('id', announcement.id);
            throw new Error(
              `Failed to upload attachment: ${uploadError.message}`
            );
          }

          // Create attachment record
          attachmentInserts.push({
            announcement_id: announcement.id,
            rto_id: rtoId,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
          });
        }

        if (attachmentInserts.length > 0) {
          const { error: attachmentsError } = await supabase
            .from('announcement_attachments')
            .insert(attachmentInserts);

          if (attachmentsError) {
            // Clean up on error
            await supabase
              .from('announcements')
              .delete()
              .eq('id', announcement.id);
            throw new Error(
              `Failed to create attachment records: ${attachmentsError.message}`
            );
          }
        }
      }

      return announcement;
    },
    onSuccess: () => {
      // Invalidate announcements list
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};
