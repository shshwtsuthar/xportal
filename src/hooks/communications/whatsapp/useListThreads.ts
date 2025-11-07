import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

async function fetchThreads(
  senderId: string
): Promise<Array<Tables<'whatsapp_threads'>>> {
  if (!senderId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('whatsapp_threads')
    .select(
      'id, rto_id, sender_id, counterparty_e164, last_message_at, last_dir, last_status'
    )
    .eq('sender_id', senderId)
    .order('last_message_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data || []) as Array<Tables<'whatsapp_threads'>>;
}

export function useListThreads(senderId: string) {
  const qc = useQueryClient();
  const query = useQuery<Array<Tables<'whatsapp_threads'>>, Error>({
    queryKey: ['whatsapp', 'threads', senderId],
    queryFn: () => fetchThreads(senderId),
    enabled: !!senderId,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!senderId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`realtime:threads:${senderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_threads',
          filter: `sender_id=eq.${senderId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['whatsapp', 'threads', senderId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [senderId, qc]);

  return query;
}
