'use client';

import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useListMessages } from '@/src/hooks/communications/whatsapp/useListMessages';
import { Skeleton } from '@/components/ui/skeleton';

export default function MessagePane({
  threadId,
}: {
  threadId?: string | null;
}) {
  const { data, isLoading } = useListMessages(threadId || '');
  const messages = data || [];
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);
  return (
    <Card className="h-[60vh] p-3">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-2">
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
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[70%] rounded px-3 py-2 ${m.direction === 'OUT' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted mr-auto'}`}
            >
              <div className="text-sm break-words whitespace-pre-wrap">
                {m.body || ''}
              </div>
              {m.direction === 'OUT' && (
                <div className="mt-1 text-right text-[10px] opacity-70">
                  {m.status}
                </div>
              )}
            </div>
          ))}
          {threadId && !isLoading && messages.length === 0 && (
            <div className="text-muted-foreground text-sm">No messages.</div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>
    </Card>
  );
}
