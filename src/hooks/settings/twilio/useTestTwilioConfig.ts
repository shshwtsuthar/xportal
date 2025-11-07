import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

type TestResult = { ok: boolean; details?: unknown; error?: string };
async function testConnection(): Promise<TestResult> {
  const res = await fetch('/api/settings/twilio/config/test');
  const data = (await res.json()) as TestResult;
  return data;
}

export const useTestTwilioConfig = () => {
  return useMutation<
    { ok: boolean; details?: unknown; error?: string },
    Error,
    void
  >({
    mutationFn: testConnection,
    onSuccess: (data) => {
      if (data.ok) {
        toast.success('Twilio connection OK');
      } else {
        toast.error(data.error || 'Connection failed');
      }
    },
    onError: (e) => toast.error(e.message),
  });
};
