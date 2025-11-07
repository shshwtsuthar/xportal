'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useListMessages } from '@/src/hooks/communications/whatsapp/useListMessages';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/database.types';

type WhatsAppMessage = Tables<'whatsapp_messages'>;

type TimelineItem =
  | { type: 'divider'; id: string; label: string }
  | { type: 'msg'; id: string; payload: WhatsAppMessage };

export default function MessagePane({
  threadId,
}: {
  threadId?: string | null;
}) {
  const { data, isLoading } = useListMessages(threadId || '');
  const messages = useMemo<WhatsAppMessage[]>(() => data ?? [], [data]);
  const [older, setOlder] = useState<WhatsAppMessage[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo<TimelineItem[]>(() => {
    const parts: TimelineItem[] = [];
    let lastDay: string | null = null;
    const all = [...older, ...messages];
    for (const message of all) {
      const occurredAt = message.occurred_at
        ? new Date(message.occurred_at)
        : null;
      const day = occurredAt ? occurredAt.toDateString() : 'Unknown date';
      if (day !== lastDay) {
        parts.push({ type: 'divider', id: `div-${day}`, label: day });
        lastDay = day;
      }
      const messageId =
        typeof message.id === 'string' ? message.id : String(message.id);
      parts.push({ type: 'msg', id: messageId, payload: message });
    }
    return parts;
  }, [messages, older]);

  const getStatusText = (status?: WhatsAppMessage['status'] | null) => {
    switch (status) {
      case 'queued':
        return '⏳ queued';
      case 'sending':
        return '⏳ sending';
      case 'sent':
        return '✓ sent';
      case 'delivered':
        return '✓✓ delivered';
      case 'read':
        return '✓✓ read';
      case 'undelivered':
      case 'failed':
        return '⚠️ failed';
      default:
        return '';
    }
  };

  const renderMedia = (urls: WhatsAppMessage['media_urls']) => {
    if (!urls || urls.length === 0) return null;
    return (
      <div className="mt-1 space-y-1">
        {urls.map((url) => {
          const lower = url.toLowerCase();
          const isImg =
            lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.png') ||
            lower.endsWith('.webp');
          const isMp4 = lower.endsWith('.mp4');
          if (isImg) {
            return (
              <Image
                key={url}
                src={url}
                alt="attachment"
                width={512}
                height={512}
                className="max-h-64 w-auto rounded"
                unoptimized
              />
            );
          }
          if (isMp4) {
            return (
              <video
                key={url}
                src={url}
                controls
                className="max-h-64 rounded"
              />
            );
          }
          return (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs underline"
            >
              {url}
            </a>
          );
        })}
      </div>
    );
  };

  const handleLoadOlder = async () => {
    if (!threadId || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const oldest = (older[0] || messages[0])?.occurred_at;
      if (!oldest) {
        setLoadingOlder(false);
        return;
      }
      const { data: olderData } = await supabase
        .from('whatsapp_messages')
        .select(
          'id, thread_id, sender_id, direction, body, media_urls, status, occurred_at'
        )
        .eq('thread_id', threadId)
        .lt('occurred_at', oldest)
        .order('occurred_at', { ascending: false })
        .limit(30);
      const fetched = ((olderData ?? []) as WhatsAppMessage[]).reverse();
      setOlder((prev) => [...fetched, ...prev]);
    } finally {
      setLoadingOlder(false);
    }
  };

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 120;
    if (nearBottom) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  return (
    <Card className="h-[60vh] p-3">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-2">
          {threadId && messages.length > 0 && (
            <div className="mb-2 flex justify-center">
              <button
                className="text-muted-foreground text-xs underline disabled:opacity-50"
                onClick={handleLoadOlder}
                disabled={loadingOlder}
              >
                {loadingOlder ? 'Loading…' : 'Load older messages'}
              </button>
            </div>
          )}
          {!threadId && (
            <div className="text-muted-foreground text-sm">
              Select a conversation to view messages.
            </div>
          )}
          {threadId && isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="ml-auto h-6 w-1/2" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="ml-auto h-6 w-1/3" />
            </div>
          )}
          <div ref={scrollAreaRef} />
          {items.map((item) => {
            if (item.type === 'divider') {
              return (
                <div
                  key={item.id}
                  className="text-muted-foreground mx-auto my-2 text-xs"
                >
                  {item.label}
                </div>
              );
            }
            const message = item.payload;
            const occurred = message.occurred_at
              ? new Date(message.occurred_at)
              : null;
            return (
              <div
                key={item.id}
                className={`max-w-[70%] rounded px-3 py-2 ${
                  message.direction === 'OUT'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted mr-auto'
                }`}
              >
                <div className="text-sm break-words whitespace-pre-wrap">
                  {message.body || ''}
                </div>
                {renderMedia(message.media_urls)}
                <div
                  className={`mt-1 text-[10px] opacity-70 ${message.direction === 'OUT' ? 'text-right' : ''}`}
                >
                  {occurred
                    ? occurred.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                  {message.direction === 'OUT' && message.status ? (
                    <span className="ml-2">
                      {getStatusText(message.status)}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
          {threadId && !isLoading && messages.length === 0 && (
            <div className="text-muted-foreground text-sm">No messages.</div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>
    </Card>
  );
}
