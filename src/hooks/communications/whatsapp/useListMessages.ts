import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

async function fetchMessages(
  threadId: string
): Promise<Array<Tables<'whatsapp_messages'>>> {
  if (!threadId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select(
      'id, thread_id, sender_id, direction, body, media_urls, status, occurred_at'
    )
    .eq('thread_id', threadId)
    .order('occurred_at', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data || []) as Array<Tables<'whatsapp_messages'>>;
}

export function useListMessages(threadId: string) {
  const qc = useQueryClient();
  const query = useQuery<Array<Tables<'whatsapp_messages'>>, Error>({
    queryKey: ['whatsapp', 'messages', threadId],
    queryFn: () => fetchMessages(threadId),
    enabled: !!threadId,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: false,
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
