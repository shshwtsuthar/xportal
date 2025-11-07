'use client';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useListThreads } from '@/src/hooks/communications/whatsapp/useListThreads';
import { buildUrlWithParams } from '@/lib/utils/url';
import { Skeleton } from '@/components/ui/skeleton';

export default function ThreadList({
  senderId,
  selectedThreadId,
}: {
  senderId: string;
  selectedThreadId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const qp = useSearchParams();
  const { data, isLoading } = useListThreads(senderId);
  const threads = data || [];

  return (
    <Card className="p-2">
      <ScrollArea className="h-[60vh]">
        <div className="space-y-1">
          {isLoading && (
            <div className="space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded p-2">
                  <Skeleton className="mb-1 h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}
          {threads.map((t) => {
            const active = t.id === selectedThreadId;
            return (
              <button
                key={t.id}
                className={`w-full rounded p-2 text-left ${active ? 'bg-muted' : 'hover:bg-muted/50'}`}
                onClick={() => {
                  const url = buildUrlWithParams(pathname, qp, {
                    thread: t.id,
                  });
                  router.push(url);
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
