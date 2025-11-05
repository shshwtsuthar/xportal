import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export type EmailDetail = {
  id: string;
  created_at: string;
  created_by: string | null;
  from_email: string;
  from_name: string | null;
  reply_to: string[] | null;
  subject: string;
  html_body: string;
  text_body: string | null;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'COMPLAINED';
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  resend_message_id: string | null;
  email_message_participants: { email: string; type: 'TO' | 'CC' | 'BCC' }[];
  email_message_status_events: {
    event_type: EmailDetail['status'];
    occurred_at: string;
    payload: unknown;
  }[];
};

/**
 * useGetEmailById
 *
 * Fetch a single email record including HTML body, recipients, and status events
 * for the drawer preview on the Mail page.
 *
 * @param id Email message id (UUID)
 * @returns TanStack Query result containing EmailDetail
 */
export const useGetEmailById = (id: string | null | undefined) => {
  return useQuery<EmailDetail>({
    queryKey: ['emails', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error('Email ID is required');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('email_messages')
        .select(
          `id, created_at, created_by, from_email, from_name, reply_to, subject, html_body, text_body, status, sent_at, delivered_at, failed_at, error_message, resend_message_id,
           email_message_participants(email,type),
           email_message_status_events(event_type, occurred_at, payload)`
        )
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      return data as unknown as EmailDetail;
    },
  });
};
