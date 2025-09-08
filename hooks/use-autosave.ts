import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/utils';
import { usePatchApplication } from './use-application-api';

type GetPayload = () => unknown;

interface UseAutosaveOptions {
  applicationId: string;
  getPayload: GetPayload;
  enabled?: boolean;
  debounceMs?: number;
}

export function useAutosave({ applicationId, getPayload, enabled = true, debounceMs = 1500 }: UseAutosaveOptions) {
  const { mutateAsync: patch } = usePatchApplication(applicationId);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef(false);
  const backoffMsRef = useRef<number>(1000); // start 1s
  const maxBackoffMs = 30000; // 30s ceiling
  const isUuidLike = /^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
  const isValidId = isUuidLike.test(applicationId);

  const queueKey = `autosave-queue:${applicationId}`;
  const enqueue = (payload: unknown) => {
    if (typeof window === 'undefined') return;
    const current = window.localStorage.getItem(queueKey);
    const list = current ? JSON.parse(current) as any[] : [];
    list.push({ ts: Date.now(), payload });
    window.localStorage.setItem(queueKey, JSON.stringify(list));
  };
  const drainQueue = async () => {
    if (typeof window === 'undefined') return;
    const current = window.localStorage.getItem(queueKey);
    if (!current) return;
    const list = JSON.parse(current) as any[];
    for (const item of list) {
      await patch(item.payload);
    }
    window.localStorage.removeItem(queueKey);
  };

  const flush = async () => {
    if (!enabled || !isValidId) return;
    try {
      setStatus('saving');
      pendingRef.current = false;
      const payload = getPayload();
      if (!navigator.onLine) {
        enqueue(payload);
        setStatus('saved');
        setLastSavedAt(Date.now());
        toast.dismiss('autosave');
        toast.success('Draft saved (offline)', { id: 'autosave-success' });
        return;
      }
      // Replay any queued changes first
      await drainQueue();
      await patch(payload);
      setStatus('saved');
      setLastSavedAt(Date.now());
      toast.dismiss('autosave');
      toast.success('Draft saved', { description: new Date().toLocaleTimeString(), id: 'autosave-success' });
      trackEvent('autosave_saved', { step: 'unknown' });
      backoffMsRef.current = 1000; // reset backoff
    } catch (err: any) {
      setStatus('error');
      const isConflict = err?.code === 412 || err?.message?.includes('412') || err?.status === 412;
      if (isConflict) {
        toast.error('Draft is out of date (version conflict). Please refresh to continue.', {
          id: 'autosave-error',
          action: {
            label: 'Refresh',
            onClick: () => typeof window !== 'undefined' && window.location.reload(),
          },
        });
      } else {
        toast.error('Autosave failed. Will retry in the background.', { id: 'autosave-error' });
      }
      trackEvent('autosave_failed', { reason: isConflict ? 'conflict' : 'network_or_server' });
      // Exponential backoff retry
      const next = Math.min(backoffMsRef.current * 2, maxBackoffMs);
      backoffMsRef.current = next;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(flush, backoffMsRef.current);
    }
  };

  const schedule = () => {
    if (!enabled) return;
    pendingRef.current = true;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    toast.loading('Saving draft…', { id: 'autosave' });
    timerRef.current = window.setTimeout(flush, debounceMs);
  };

  // Warn on unload if pending, saving, or last attempt errored
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!enabled || !isValidId) return;
      if (status === 'saving' || status === 'error' || pendingRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    const onlineHandler = () => {
      if (!enabled || !isValidId) return;
      // Attempt to drain queued changes immediately upon reconnect
      flush();
    };
    window.addEventListener('online', onlineHandler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('online', onlineHandler);
    };
  }, [enabled, status, isValidId]);

  // Public API to request autosave now (e.g., on step change)
  const saveNow = async () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    await flush();
  };

  return { schedule, saveNow, status, lastSavedAt };
}


