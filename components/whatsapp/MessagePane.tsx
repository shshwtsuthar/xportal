'use client';

import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useListMessages } from '@/src/hooks/communications/whatsapp/useListMessages';

export default function MessagePane({
  threadId,
}: {
  threadId?: string | null;
}) {
  const { data } = useListMessages(threadId || '');
  const messages = data || [];
  return (
    <Card className="h-[60vh] p-3">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-2">
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
          {messages.length === 0 && (
            <div className="text-muted-foreground text-sm">
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
