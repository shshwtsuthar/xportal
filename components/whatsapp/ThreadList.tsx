'use client';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useListThreads } from '@/src/hooks/communications/whatsapp/useListThreads';

export default function ThreadList({
  senderId,
  selectedThreadId,
}: {
  senderId: string;
  selectedThreadId?: string | null;
}) {
  const router = useRouter();
  const { data } = useListThreads(senderId);
  const threads = data || [];

  return (
    <Card className="p-2">
      <ScrollArea className="h-[60vh]">
        <div className="space-y-1">
          {threads.map((t) => {
            const active = t.id === selectedThreadId;
            return (
              <button
                key={t.id}
                className={`w-full rounded p-2 text-left ${active ? 'bg-muted' : 'hover:bg-muted/50'}`}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('thread', t.id);
                  router.push(url.toString());
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="truncate font-medium">
                    {t.counterparty_e164}
                  </div>
                  {t.last_status ? (
                    <Badge variant="secondary">{t.last_status}</Badge>
                  ) : null}
                </div>
                <div className="text-muted-foreground truncate text-xs">
                  {t.last_dir === 'OUT' ? 'You: ' : ''}
                  {t.last_preview || ''}
                </div>
              </button>
            );
          })}
          {threads.length === 0 && (
            <div className="text-muted-foreground p-2 text-sm">
              No threads yet.
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
