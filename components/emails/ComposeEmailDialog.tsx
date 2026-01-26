'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MinimalTiptap } from '@/components/emails/MinimalTiptap';
import {
  Maximize2,
  Minimize2,
  Send,
  X,
  Paperclip,
  ChevronUp,
} from 'lucide-react';
import { useSendEmail } from '@/src/hooks/useSendEmail';
import { useGetMailTemplates } from '@/src/hooks/useGetMailTemplates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const [showCc, setShowCc] = React.useState(true);
  const [ccInput, setCcInput] = React.useState('');
  const [ccRecipients, setCcRecipients] = React.useState<string[]>([]);
  const [showBcc, setShowBcc] = React.useState(true);
  const [bccInput, setBccInput] = React.useState('');
  const [bccRecipients, setBccRecipients] = React.useState<string[]>([]);
  const [subject, setSubject] = React.useState('');
  const [html, setHtml] = React.useState('');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<
    string | undefined
  >();
  const [attachments, setAttachments] = React.useState<
    Array<{ file: File; id: string }>
  >([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { mutateAsync, isPending } = useSendEmail();

  // Fetch mail templates for the dropdown
  const { data: templatesData } = useGetMailTemplates({
    page: 1,
    pageSize: 100, // Fetch enough templates for dropdown
    sort: { column: 'created_at', desc: true },
  });
  const templates = templatesData?.items ?? [];

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
      setCcRecipients([]);
      setBccRecipients([]);
      setSubject('');
      setHtml('');
      setRecipientInput('');
      setCcInput('');
      setBccInput('');
      setAttachments([]);
      setSelectedTemplateId(undefined);
      // Keep Cc and Bcc fields displayed/open by default
      // Don't reset showCc and showBcc to false
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

  const addCcRecipient = React.useCallback(
    (value: string) => {
      const email = value.trim();
      if (!email) return;
      if (ccRecipients.includes(email)) return;
      setCcRecipients((prev) => [...prev, email]);
    },
    [ccRecipients]
  );

  const addBccRecipient = React.useCallback(
    (value: string) => {
      const email = value.trim();
      if (!email) return;
      if (bccRecipients.includes(email)) return;
      setBccRecipients((prev) => [...prev, email]);
    },
    [bccRecipients]
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

  const handleCcKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCcRecipient(ccInput);
      setCcInput('');
    } else if (e.key === 'Backspace' && ccInput.length === 0) {
      setCcRecipients((prev) => prev.slice(0, -1));
    }
  };

  const handleBccKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    e
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addBccRecipient(bccInput);
      setBccInput('');
    } else if (e.key === 'Backspace' && bccInput.length === 0) {
      setBccRecipients((prev) => prev.slice(0, -1));
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const removeCcRecipient = (email: string) => {
    setCcRecipients((prev) => prev.filter((r) => r !== email));
  };

  const removeBccRecipient = (email: string) => {
    setBccRecipients((prev) => prev.filter((r) => r !== email));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_FILES = 10;

    // Check total file count
    if (attachments.length + files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      e.target.value = '';
      return;
    }

    // Validate each file
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 10MB limit`);
        e.target.value = '';
        return;
      }
    }

    // Add files to attachments
    const newAttachments = files.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSend = async () => {
    if (recipients.length === 0 || !subject || !html) return;

    // Convert attachments to base64
    const attachmentPromises = attachments.map(async (att) => {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:image/png;base64,")
          const base64Content = result.split(',')[1] || result;
          resolve(base64Content);
        };
        reader.onerror = reject;
        reader.readAsDataURL(att.file);
      });

      return {
        filename: att.file.name,
        content: base64,
        contentType: att.file.type || 'application/octet-stream',
        size: att.file.size,
      };
    });

    const emailAttachments = await Promise.all(attachmentPromises);

    await mutateAsync({
      to: recipients,
      subject,
      html,
      cc: ccRecipients.length > 0 ? ccRecipients : undefined,
      bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
    });
    close();
    // Reset state after close
    setTimeout(() => {
      setRecipients([]);
      setCcRecipients([]);
      setBccRecipients([]);
      setSubject('');
      setHtml('');
      setRecipientInput('');
      setCcInput('');
      setBccInput('');
      setAttachments([]);
      setIsFullscreen(false);
      setSelectedTemplateId(undefined);
    }, 0);
  };

  // Handle template selection
  const handleTemplateChange = (value: string) => {
    if (value === 'none') {
      // "None" option selected - clear template selection
      setSelectedTemplateId(undefined);
      return;
    }

    // Find the selected template
    const selectedTemplate = templates.find((t) => t.id === value);
    if (selectedTemplate) {
      setSelectedTemplateId(value);
      // Replace Subject and Body with template content
      setSubject(selectedTemplate.subject);
      setHtml(selectedTemplate.html_body);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'flex h-[90vh] max-h-[90vh] max-w-[95vw] flex-col overflow-hidden p-0 sm:max-w-2xl md:max-w-3xl lg:max-w-4xl',
          isFullscreen &&
            'h-screen max-h-screen w-screen max-w-[100vw] sm:rounded-none'
        )}
      >
        <DialogTitle className="sr-only">New Message</DialogTitle>

        {/* Header */}
        <div className="bg-muted/30 flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6">
          <h2 className="text-base font-semibold sm:text-lg">New Message</h2>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsFullscreen((s) => !s)}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="h-8 w-8"
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
              className="h-8 w-8"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            {/* Recipients Section */}
            <div className="space-y-3">
              <div>
                <label
                  className="text-muted-foreground mb-1.5 block text-xs font-medium"
                  htmlFor="recipients"
                >
                  To
                </label>
                <div
                  className="bg-background focus-within:ring-ring flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-offset-2"
                  role="group"
                  aria-label="Recipients"
                >
                  {recipients.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="gap-1.5 px-2 py-0.5 text-xs"
                    >
                      <span className="max-w-[200px] truncate sm:max-w-none">
                        {email}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRecipient(email)}
                        className="focus:ring-ring hover:bg-destructive/20 hover:text-destructive ml-0.5 rounded-full p-0.5 text-xs focus:ring-2 focus:outline-hidden"
                        aria-label={`Remove ${email}`}
                        tabIndex={0}
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
                    placeholder={
                      recipients.length === 0
                        ? 'Add recipients and press Enter'
                        : ''
                    }
                    className="h-auto min-h-6 min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    aria-label="Recipients input"
                  />
                </div>
              </div>

              {/* Cc field - collapsible */}
              <div>
                {!showCc ? (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                    aria-label="Show Cc field"
                  >
                    Cc
                  </button>
                ) : (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label
                        className="text-muted-foreground block text-xs font-medium"
                        htmlFor="cc"
                      >
                        Cc
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCc(false)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm p-1 transition-colors"
                        aria-label="Hide Cc"
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                    </div>
                    <div
                      className="bg-background focus-within:ring-ring flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-offset-2"
                      role="group"
                      aria-label="Cc recipients"
                    >
                      {ccRecipients.map((email) => (
                        <Badge
                          key={email}
                          variant="secondary"
                          className="gap-1.5 px-2 py-0.5 text-xs"
                        >
                          <span className="max-w-[200px] truncate sm:max-w-none">
                            {email}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeCcRecipient(email)}
                            className="focus:ring-ring hover:bg-destructive/20 hover:text-destructive ml-0.5 rounded-full p-0.5 text-xs focus:ring-2 focus:outline-hidden"
                            aria-label={`Remove ${email}`}
                            tabIndex={0}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                      <Input
                        id="cc"
                        value={ccInput}
                        onChange={(e) => setCcInput(e.target.value)}
                        onKeyDown={handleCcKeyDown}
                        placeholder={
                          ccRecipients.length === 0 ? 'Add Cc recipients' : ''
                        }
                        className="h-auto min-h-6 min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        aria-label="Cc recipients input"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bcc field - collapsible */}
              <div>
                {!showBcc ? (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                    aria-label="Show Bcc field"
                  >
                    Bcc
                  </button>
                ) : (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label
                        className="text-muted-foreground block text-xs font-medium"
                        htmlFor="bcc"
                      >
                        Bcc
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowBcc(false)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm p-1 transition-colors"
                        aria-label="Hide Bcc"
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                    </div>
                    <div
                      className="bg-background focus-within:ring-ring flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-offset-2"
                      role="group"
                      aria-label="Bcc recipients"
                    >
                      {bccRecipients.map((email) => (
                        <Badge
                          key={email}
                          variant="secondary"
                          className="gap-1.5 px-2 py-0.5 text-xs"
                        >
                          <span className="max-w-[200px] truncate sm:max-w-none">
                            {email}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeBccRecipient(email)}
                            className="focus:ring-ring hover:bg-destructive/20 hover:text-destructive ml-0.5 rounded-full p-0.5 text-xs focus:ring-2 focus:outline-hidden"
                            aria-label={`Remove ${email}`}
                            tabIndex={0}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                      <Input
                        id="bcc"
                        value={bccInput}
                        onChange={(e) => setBccInput(e.target.value)}
                        onKeyDown={handleBccKeyDown}
                        placeholder={
                          bccRecipients.length === 0 ? 'Add Bcc recipients' : ''
                        }
                        className="h-auto min-h-6 min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        aria-label="Bcc recipients input"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Template Selection */}
            <div>
              <label
                className="text-muted-foreground mb-1.5 block text-xs font-medium"
                htmlFor="template-select"
              >
                Template (optional)
              </label>
              <Select
                value={selectedTemplateId || 'none'}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger id="template-select" className="w-full">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div>
              <label
                className="text-muted-foreground mb-1.5 block text-xs font-medium"
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
                className="w-full"
              />
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="bg-muted/30 flex flex-wrap gap-2 rounded-md border p-2">
                {attachments.map((att) => (
                  <Badge
                    key={att.id}
                    variant="secondary"
                    className="gap-1.5 px-2.5 py-1 text-xs"
                  >
                    <Paperclip className="size-3 shrink-0" />
                    <span className="max-w-[150px] truncate sm:max-w-[200px]">
                      {att.file.name}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      ({formatFileSize(att.file.size)})
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="focus:ring-ring hover:bg-destructive/20 hover:text-destructive ml-1 rounded-full p-0.5 text-xs focus:ring-2 focus:outline-hidden"
                      aria-label={`Remove ${att.file.name}`}
                      tabIndex={0}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Email Body Editor */}
            <div className="min-h-[300px]">
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                Message
              </label>
              <MinimalTiptap
                content={html}
                onChange={setHtml}
                placeholder="Start typing your message..."
                className="min-h-[280px]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-muted/30 flex shrink-0 items-center justify-between border-t px-4 py-3 sm:px-6">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              aria-label="Attach files"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach files"
              className="gap-2"
            >
              <Paperclip className="size-4" />
              <span className="hidden sm:inline">Attach</span>
            </Button>
          </div>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isPending || recipients.length === 0 || !subject || !html}
            aria-label="Send email"
            className="gap-2"
          >
            <Send className="size-4" />
            <span>Send</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
