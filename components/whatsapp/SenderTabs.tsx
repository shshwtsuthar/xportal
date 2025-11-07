'use client';

import { useEffect, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useListTwilioSenders } from '@/src/hooks/useListTwilioSenders';
import { useGetTwilioConfig } from '@/src/hooks/useGetTwilioConfig';
import { buildUrlWithParams } from '@/lib/utils/url';

export default function SenderTabs() {
  const { data: senders } = useListTwilioSenders();
  const { data: cfg } = useGetTwilioConfig();
  const whatsappSenders = useMemo(
    () =>
      (senders || []).filter((s) => s.channel === 'whatsapp' && s.is_active),
    [senders]
  );
  const hasService = Boolean(cfg?.messaging_service_sid);
  const qp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const senderId = qp.get('sender') || '';

  useEffect(() => {
    if (!senderId) {
      const defaultSender = hasService ? 'auto' : whatsappSenders[0]?.id;
      if (defaultSender) {
        const url = buildUrlWithParams(pathname, qp, {
          sender: defaultSender,
          thread: '',
        });
        router.replace(url);
      }
    }
  }, [senderId, whatsappSenders, hasService, router, pathname, qp]);

  const tabs = [
    ...(hasService ? [{ id: 'auto', label: 'Auto (Service)' }] : []),
    ...whatsappSenders.map((s) => ({ id: s.id, label: s.friendly_name })),
  ];
  if (tabs.length <= 1) return null;

  return (
    <Tabs
      value={senderId}
      onValueChange={(id) => {
        const url = buildUrlWithParams(pathname, qp, {
          sender: id,
          thread: '',
        });
        router.push(url);
      }}
    >
      <TabsList className="flex w-full flex-wrap">
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="flex-1">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
