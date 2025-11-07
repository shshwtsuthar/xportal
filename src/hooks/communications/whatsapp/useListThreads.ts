import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export type ThreadRow = {
  id: string;
  rto_id: string;
  sender_id: string;
  counterparty_e164: string;
  last_message_at: string | null;
  last_dir: 'OUT' | 'IN' | null;
  last_status:
    | 'queued'
    | 'sending'
    | 'sent'
    | 'delivered'
    | 'read'
    | 'undelivered'
    | 'failed'
    | null;
  last_preview?: string | null;
};

async function fetchThreads(senderId: string): Promise<ThreadRow[]> {
  if (!senderId) return [];
  const res = await fetch(
    `/api/communications/whatsapp/threads?senderId=${encodeURIComponent(senderId)}`
  );
  const data = (await res.json()) as ThreadRow[] | { error: string };
  if (Array.isArray(data)) return data;
  if ('error' in data) throw new Error(data.error);
  return [];
}

export function useListThreads(senderId: string) {
  const qc = useQueryClient();
  const query = useQuery<ThreadRow[], Error>({
    queryKey: ['whatsapp', 'threads', senderId],
    queryFn: () => fetchThreads(senderId),
    enabled: !!senderId,
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
