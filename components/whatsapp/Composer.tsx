'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import { useSendWhatsAppMessage } from '@/src/hooks/communications/whatsapp/useSendWhatsAppMessage';
import { toast } from 'sonner';
import { uploadWhatsAppMedia } from '@/src/hooks/communications/whatsapp/useUploadMedia';
import { useListTemplates } from '@/src/hooks/communications/whatsapp/useListTemplates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Composer() {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  );
  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const qp = useSearchParams();
  const senderId = qp.get('sender') || '';
  const threadId = qp.get('thread') || '';
  const toE164 = qp.get('to') || '';
  const send = useSendWhatsAppMessage();
  const { data: templates } = useListTemplates();
  const [requiresTemplate, setRequiresTemplate] = useState(false);
  const [templateSid, setTemplateSid] = useState<string | undefined>();
  const [templateVars, setTemplateVars] = useState<
    Array<{ key: string; value: string }>
  >([]);

  // Determine 24h window requirement based on last inbound message for the thread
  // If no thread, allow free-form (composer used only within a thread in current UI)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!threadId) {
        setRequiresTemplate(false);
        return;
      }
      try {
        const supabase = (await import('@/lib/supabase/client')).createClient();
        const { data } = await supabase
          .from('whatsapp_messages')
          .select('occurred_at')
          .eq('thread_id', threadId)
          .eq('direction', 'IN')
          .order('occurred_at', { ascending: false })
          .limit(1);
        const lastInbound = data?.[0]?.occurred_at as unknown as
          | string
          | undefined;
        if (!lastInbound) {
          // No inbound yet -> require template
          if (!cancelled) setRequiresTemplate(true);
          return;
        }
        const last = new Date(lastInbound).getTime();
        const now = Date.now();
        const diffHrs = (now - last) / (1000 * 60 * 60);
        if (!cancelled) setRequiresTemplate(diffHrs >= 24);
      } catch {
        if (!cancelled) setRequiresTemplate(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const handleSend = async () => {
    if (!senderId) return toast.error('Select a sender');
    if (requiresTemplate) {
      if (!templateSid) {
        toast.error('Select a template');
        return;
      }
    } else if (!text.trim() && files.length === 0) {
      return;
    }
    if (!toE164 && !threadId) return toast.error('Select a thread');
    let mediaUrls: string[] | undefined;
    if (files.length > 0) {
      try {
        const uploaded = await uploadWhatsAppMedia(files, {
          threadId: threadId || undefined,
        });
        mediaUrls = uploaded.map((u) => u.url);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        toast.error(msg);
        return;
      }
    }
    const params = templateVars.reduce<Record<string, string>>((acc, kv) => {
      if (kv.key) acc[kv.key] = kv.value;
      return acc;
    }, {});
    await send.mutateAsync({
      senderId,
      threadId,
      toE164,
      body: requiresTemplate ? undefined : text.trim() || undefined,
      mediaUrls,
      templateSid,
      templateParams: Object.keys(params).length ? params : undefined,
    });
    setText('');
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTemplateSid(undefined);
    setTemplateVars([]);
  };

  return (
    <div className="space-y-2">
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map(({ file, url }) => {
            const lower = file.name.toLowerCase();
            const isImg =
              lower.endsWith('.jpg') ||
              lower.endsWith('.jpeg') ||
              lower.endsWith('.png') ||
              lower.endsWith('.webp');
            return (
              <div key={file.name} className="rounded border p-2">
                {isImg ? (
                  <Image
                    src={url}
                    alt={file.name}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="text-xs">{file.name}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          {requiresTemplate ? (
            <div className="space-y-2">
              <Select
                value={templateSid}
                onValueChange={(v) => setTemplateSid(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {(templates || []).map((t) => (
                    <SelectItem key={t.sid} value={t.sid}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-2">
                {templateVars.map((kv, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="Variable key"
                      value={kv.key}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTemplateVars((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, key: v } : p))
                        );
                      }}
                    />
                    <Input
                      placeholder="Value"
                      value={kv.value}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTemplateVars((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, value: v } : p
                          )
                        );
                      }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="text-muted-foreground text-xs underline"
                  onClick={() =>
                    setTemplateVars((prev) => [...prev, { key: '', value: '' }])
                  }
                >
                  Add variable
                </button>
              </div>
            </div>
          ) : (
            <textarea
              aria-label="Message"
              placeholder="Type a message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              className="w-full resize-none rounded-md border bg-transparent p-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
            />
          )}
          <div className="mt-1 flex items-center gap-2">
            <button
              className="text-muted-foreground text-xs hover:underline"
              aria-label="Insert emoji"
              onClick={() => setText((t) => t + ' 😊')}
              type="button"
            >
              Emoji
            </button>
            <button
              className="text-muted-foreground text-xs hover:underline"
              aria-label="Attach files"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Attach
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/mp4,application/pdf,.doc,.docx,.pptx,.xlsx,.csv"
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
          </div>
        </div>
        <Button onClick={handleSend} disabled={send.isPending}>
          Send
        </Button>
      </div>
    </div>
  );
}
