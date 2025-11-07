import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  direction: 'OUT' | 'IN';
  body: string | null;
  media_urls: string[];
  status:
    | 'queued'
    | 'sending'
    | 'sent'
    | 'delivered'
    | 'read'
    | 'undelivered'
    | 'failed';
  occurred_at: string;
};

async function fetchMessages(threadId: string): Promise<MessageRow[]> {
  if (!threadId) return [];
  const res = await fetch(
    `/api/communications/whatsapp/messages?threadId=${encodeURIComponent(threadId)}`
  );
  const data = (await res.json()) as MessageRow[] | { error: string };
  if (Array.isArray(data)) return data;
  if ('error' in data) throw new Error(data.error);
  return [];
}

export function useListMessages(threadId: string) {
  const qc = useQueryClient();
  const query = useQuery<MessageRow[], Error>({
    queryKey: ['whatsapp', 'messages', threadId],
    queryFn: () => fetchMessages(threadId),
    enabled: !!threadId,
  });

  useEffect(() => {
    if (!threadId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`realtime:messages:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          qc.invalidateQueries({
            queryKey: ['whatsapp', 'messages', threadId],
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, qc]);

  return query;
}
