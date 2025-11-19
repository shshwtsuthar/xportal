import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export type MailTemplatesFilters = {
  page?: number;
  pageSize?: number;
  sort?: {
    column: 'name' | 'created_at';
    desc?: boolean;
  };
  nameQuery?: string;
  subjectQuery?: string;
};

export type MailTemplateListItem = {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  created_at: string;
  created_by: string | null;
  creator_profile: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

/**
 * useGetMailTemplates
 *
 * Fetch paginated mail templates with optional name/subject filters.
 *
 * @param filters Mail templates filters and pagination
 * @returns TanStack Query result containing items and total count
 */
export const useGetMailTemplates = (filters: MailTemplatesFilters) => {
  return useQuery<{ items: MailTemplateListItem[]; total: number }>({
    queryKey: ['mail-templates', filters],
    queryFn: async () => {
      const supabase = createClient();
      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('mail_templates')
        .select(
          'id, name, subject, html_body, created_at, created_by, creator_profile:profiles!created_by(first_name,last_name)',
          { count: 'exact' }
        );

      if (filters.nameQuery?.trim()) {
        query = query.ilike('name', `%${filters.nameQuery.trim()}%`);
      }

      if (filters.subjectQuery?.trim()) {
        query = query.ilike('subject', `%${filters.subjectQuery.trim()}%`);
      }

      const sortColumn = filters.sort?.column ?? 'created_at';
      const sortDesc = filters.sort?.desc ?? true;
      query = query.order(sortColumn, {
        ascending: !sortDesc,
        nullsFirst: false,
      });

      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return {
        items: (data ?? []) as MailTemplateListItem[],
        total: count ?? 0,
      };
    },
    placeholderData: (previousData) => previousData,
  });
};
