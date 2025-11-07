'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import { useSendWhatsAppMessage } from '@/src/hooks/communications/whatsapp/useSendWhatsAppMessage';
import { toast } from 'sonner';

export default function Composer() {
  const [text, setText] = useState('');
  const qp = useSearchParams();
  const senderId = qp.get('sender') || '';
  const threadId = qp.get('thread') || '';
  const toE164 = qp.get('to') || '';
  const send = useSendWhatsAppMessage();

  const handleSend = async () => {
    if (!senderId) return toast.error('Select a sender');
    if (!text.trim()) return;
    if (!toE164 && !threadId) return toast.error('Select a thread');
    await send.mutateAsync({ senderId, threadId, toE164, body: text.trim() });
    setText('');
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Type a message"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <Button onClick={handleSend} disabled={send.isPending}>
        Send
      </Button>
    </div>
  );
}
