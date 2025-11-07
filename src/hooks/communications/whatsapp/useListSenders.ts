import { useMemo } from 'react';
import { useListTwilioSenders } from '@/src/hooks/useListTwilioSenders';

export function useListWhatsAppSenders() {
  const { data, ...rest } = useListTwilioSenders();
  const wa = useMemo(
    () => (data || []).filter((s) => s.channel === 'whatsapp' && s.is_active),
    [data]
  );
  return { data: wa, ...rest } as const;
}
