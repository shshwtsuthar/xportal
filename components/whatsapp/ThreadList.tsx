'use client';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useListThreads } from '@/src/hooks/communications/whatsapp/useListThreads';
import { buildUrlWithParams } from '@/lib/utils/url';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useEffect, useMemo, useState } from 'react';

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
  const [search, setSearch] = useState('');
  const [pinned, setPinned] = useState<string[]>([]);

  useEffect(() => {
    const key = `wa:pins:${senderId || 'none'}`;
    try {
      const raw = localStorage.getItem(key);
      setPinned(raw ? JSON.parse(raw) : []);
    } catch {
      setPinned([]);
    }
  }, [senderId]);

  const threads = useMemo(() => {
    const list = (data || []).slice();
    const filtered = search
      ? list.filter((t) => t.counterparty_e164.includes(search))
      : list;
    const sorted = filtered.sort((a, b) => {
      const aPinned = pinned.includes(a.id);
      const bPinned = pinned.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
    return sorted;
  }, [data, search, pinned]);

  const togglePin = (id: string) => {
    const key = `wa:pins:${senderId || 'none'}`;
    setPinned((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };

  return (
    <Card className="p-2">
      <div className="mb-2">
        <Input
          placeholder="Search by number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
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
            const showUnread = t.last_dir === 'IN';
            const isPinned = pinned.includes(t.id);
            return (
              <div
                key={t.id}
                className={`group rounded ${active ? 'bg-muted' : ''}`}
              >
                <button
                  className={`w-full rounded p-2 text-left ${active ? '' : 'hover:bg-muted/50'}`}
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
                    <div className="flex items-center gap-2">
                      {showUnread && <Badge variant="secondary">New</Badge>}
                      {t.last_status ? (
                        <Badge variant="outline">{t.last_status}</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-muted-foreground truncate text-xs">
                    {t.last_dir === 'OUT' ? 'You: ' : ''}
                  </div>
                </button>
                <div className="px-2 pb-2">
                  <button
                    className="text-muted-foreground text-xs hover:underline"
                    onClick={() => togglePin(t.id)}
                  >
                    {isPinned ? 'Unpin' : 'Pin'}
                  </button>
                </div>
              </div>
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
