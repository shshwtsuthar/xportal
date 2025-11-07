'use client';

import { useEffect, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useListTwilioSenders } from '@/src/hooks/useListTwilioSenders';
import { buildUrlWithParams } from '@/lib/utils/url';

export default function SenderTabs() {
  const { data: senders } = useListTwilioSenders();
  const whatsappSenders = useMemo(
    () =>
      (senders || []).filter((s) => s.channel === 'whatsapp' && s.is_active),
    [senders]
  );
  const qp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const senderId = qp.get('sender') || '';

  useEffect(() => {
    if (!senderId && whatsappSenders.length > 0) {
      const url = buildUrlWithParams(pathname, qp, {
        sender: whatsappSenders[0].id,
      });
      router.replace(url);
    }
  }, [senderId, whatsappSenders, router, pathname, qp]);

  if (whatsappSenders.length <= 1) {
    return null;
  }

  return (
    <Tabs
      value={senderId}
      onValueChange={(id) => {
        const url = buildUrlWithParams(pathname, qp, { sender: id });
        router.push(url);
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
