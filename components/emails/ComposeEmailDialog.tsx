'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MinimalTiptap } from '@/components/emails/MinimalTiptap';
import { Maximize2, Minimize2, Send, X } from 'lucide-react';
import { useSendEmail } from '@/src/hooks/useSendEmail';
import { cn } from '@/lib/utils';

type ComposeEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRecipients?: string[];
};

export function ComposeEmailDialog({
  open,
  onOpenChange,
  initialRecipients = [],
}: ComposeEmailDialogProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [recipientInput, setRecipientInput] = React.useState('');
  const [recipients, setRecipients] = React.useState<string[]>([]);
  const [subject, setSubject] = React.useState('');
  const [html, setHtml] = React.useState('');
  const { mutateAsync, isPending } = useSendEmail();

  const close = () => onOpenChange(false);

  // Prefill recipients from initialRecipients when dialog opens
  React.useEffect(() => {
    if (open && initialRecipients.length > 0) {
      // Deduplicate and filter out empty values
      const uniqueRecipients = Array.from(
        new Set(
          initialRecipients
            .map((email) => email.trim())
            .filter((email) => email.length > 0)
        )
      );
      setRecipients(uniqueRecipients);
    }
    // Reset when dialog closes
    if (!open) {
      setRecipients([]);
      setSubject('');
      setHtml('');
      setRecipientInput('');
    }
  }, [open, initialRecipients]);

  const addRecipient = React.useCallback(
    (value: string) => {
      const email = value.trim();
      if (!email) return;
      if (recipients.includes(email)) return;
      setRecipients((prev) => [...prev, email]);
    },
    [recipients]
  );

  const handleRecipientsKeyDown: React.KeyboardEventHandler<
    HTMLInputElement
  > = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient(recipientInput);
      setRecipientInput('');
    } else if (e.key === 'Backspace' && recipientInput.length === 0) {
      setRecipients((prev) => prev.slice(0, -1));
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const handleSend = async () => {
    if (recipients.length === 0 || !subject || !html) return;
    await mutateAsync({ to: recipients, subject, html });
    close();
    // Reset state after close
    setTimeout(() => {
      setRecipients([]);
      setSubject('');
      setHtml('');
      setRecipientInput('');
      setIsFullscreen(false);
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'overflow-hidden p-0 sm:max-w-3xl',
          isFullscreen && 'h-screen w-screen max-w-[100vw] sm:rounded-none'
        )}
      >
        <DialogTitle className="sr-only">New Message</DialogTitle>
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm font-medium">New Message</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsFullscreen((s) => !s)}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={close}
              aria-label="Close compose"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4">
          <div>
            <label
              className="text-muted-foreground mb-1 block text-xs"
              htmlFor="recipients"
            >
              To
            </label>
            <div
              className="flex min-h-10 flex-wrap items-center gap-1 rounded-md border px-2 py-1"
              role="group"
              aria-label="Recipients"
            >
              {recipients.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1">
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => removeRecipient(email)}
                    className="focus:ring-ring -mr-1 ml-1 rounded-xs px-1 text-xs hover:bg-black/5 focus:ring-2 focus:outline-hidden"
                    aria-label={`Remove ${email}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
              <Input
                id="recipients"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleRecipientsKeyDown}
                placeholder="Add recipients and press Enter"
                className="h-8 min-w-40 flex-1 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label="Recipients input"
              />
              {/* Comma after the last badge to mimic Gmail */}
              {recipients.length > 0 && (
                <span className="text-muted-foreground">,</span>
              )}
            </div>
          </div>

          <div>
            <label
              className="text-muted-foreground mb-1 block text-xs"
              htmlFor="subject"
            >
              Subject
            </label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              aria-label="Subject"
            />
          </div>

          <div className="mt-2">
            <MinimalTiptap
              content=""
              onChange={setHtml}
              placeholder="Start typing..."
            />
          </div>
        </div>

        <Separator />
        <div className="flex items-center justify-end gap-2 px-4 py-3">
          <Button
            type="button"
            onClick={handleSend}
            disabled={isPending || recipients.length === 0 || !subject || !html}
            aria-label="Send email"
          >
            <Send className="size-4" />
            <span>Send</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
