'use client';

import { useEffect, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams, useRouter } from 'next/navigation';
import { useListTwilioSenders } from '@/src/hooks/useListTwilioSenders';

export default function SenderTabs() {
  const { data: senders } = useListTwilioSenders();
  const whatsappSenders = useMemo(
    () =>
      (senders || []).filter((s) => s.channel === 'whatsapp' && s.is_active),
    [senders]
  );
  const qp = useSearchParams();
  const router = useRouter();
  const senderId = qp.get('sender') || '';

  useEffect(() => {
    if (!senderId && whatsappSenders.length > 0) {
      const url = new URL(window.location.href);
      url.searchParams.set('sender', whatsappSenders[0].id);
      router.replace(url.toString());
    }
  }, [senderId, whatsappSenders, router]);

  if (whatsappSenders.length <= 1) {
    return null;
  }

  return (
    <Tabs
      value={senderId}
      onValueChange={(id) => {
        const url = new URL(window.location.href);
        url.searchParams.set('sender', id);
        router.push(url.toString());
      }}
    >
      <TabsList className="flex w-full flex-wrap">
        {whatsappSenders.map((s) => (
          <TabsTrigger key={s.id} value={s.id} className="flex-1">
            {s.friendly_name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
