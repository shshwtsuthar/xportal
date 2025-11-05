import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export type EmailStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'BOUNCED'
  | 'COMPLAINED';

export type EmailsFilters = {
  fromDate?: string; // ISO
  toDate?: string; // ISO
  senderUserId?: string;
  statuses?: EmailStatus[];
  subjectQuery?: string;
  page?: number;
  pageSize?: number;
  sort?: {
    column: 'created_at' | 'sent_at' | 'delivered_at' | 'status';
    desc?: boolean;
  };
};

export type EmailListItem = {
  id: string;
  created_at: string;
  created_by: string | null;
  subject: string;
  status: EmailStatus;
  sent_at: string | null;
  delivered_at: string | null;
  resend_message_id: string | null;
  email_message_participants: { email: string; type: 'TO' | 'CC' | 'BCC' }[];
};

/**
 * useGetEmails
 *
 * Fetch paginated email messages with basic filtering and nested participants for UI display.
 * NOTE: Recipient email filtering can be added via a SQL view later; for now, use subject/status/date filters.
 *
 * @param filters Filters and pagination controls
 * @returns TanStack Query result containing items and total count
 */
export const useGetEmails = (filters: EmailsFilters) => {
  return useQuery<{ items: EmailListItem[]; total: number }>({
    queryKey: ['emails', 'list', filters],
    queryFn: async () => {
      const supabase = createClient();
      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('email_messages')
        .select(
          'id, created_at, created_by, subject, status, sent_at, delivered_at, resend_message_id, email_message_participants(email,type)',
          { count: 'exact' }
        );

      // Date filters
      if (filters.fromDate) {
        query = query.gte('created_at', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.lte('created_at', filters.toDate);
      }

      // Sender filter
      if (filters.senderUserId) {
        query = query.eq('created_by', filters.senderUserId);
      }

      // Status filter
      if (filters.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      }

      // Subject text search
      if (filters.subjectQuery && filters.subjectQuery.trim().length > 0) {
        query = query.ilike('subject', `%${filters.subjectQuery.trim()}%`);
      }

      // Sort
      const sortCol = filters.sort?.column ?? 'created_at';
      const sortDesc = filters.sort?.desc ?? true;
      query = query.order(sortCol, { ascending: !sortDesc, nullsFirst: false });

      // Range
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);
      return { items: (data ?? []) as EmailListItem[], total: count ?? 0 };
    },
    placeholderData: (previousData) => previousData,
  });
};
