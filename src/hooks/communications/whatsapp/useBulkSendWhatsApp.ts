import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

type BulkInput = {
  senderId: string;
  body?: string;
  templateSid?: string;
  contacts: Array<{ name: string; phone: string }>;
};

async function bulkApi(input: BulkInput) {
  const res = await fetch('/api/communications/whatsapp/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Bulk send failed');
  return data as {
    results: Array<{
      phone: string;
      ok: boolean;
      sid?: string;
      error?: string;
    }>;
  };
}

export function useBulkSendWhatsApp() {
  return useMutation({
    mutationFn: bulkApi,
    onSuccess: (data) => {
      const successCount = data.results.filter((r) => r.ok).length;
      const failCount = data.results.length - successCount;
      toast.success(`Sent: ${successCount}, Failed: ${failCount}`);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Bulk send failed'),
  });
}
