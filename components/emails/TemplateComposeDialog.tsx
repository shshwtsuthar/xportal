'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MinimalTiptap } from '@/components/emails/MinimalTiptap';
import { useCreateMailTemplate } from '@/src/hooks/useCreateMailTemplate';
import { useUpdateMailTemplate } from '@/src/hooks/useUpdateMailTemplate';
import { toast } from 'sonner';

type TemplateComposeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  templateId?: string;
  initialSubject?: string;
  initialHtml?: string;
};

/**
 * TemplateComposeDialog
 *
 * Compose-style dialog for saving reusable mail templates. Keeps the familiar
 * header/body/footer layout but only exposes Subject + Body fields.
 * Supports both creating new templates and editing existing ones.
 */
export const TemplateComposeDialog = ({
  open,
  onOpenChange,
  templateName,
  templateId,
  initialSubject = '',
  initialHtml = '',
}: TemplateComposeDialogProps) => {
  const isEditMode = !!templateId;
  const [subject, setSubject] = useState(isEditMode ? initialSubject : '');
  const [html, setHtml] = useState(isEditMode ? initialHtml : '');
  const createMutation = useCreateMailTemplate();
  const updateMutation = useUpdateMailTemplate();
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      if (isEditMode) {
        setSubject(initialSubject);
        setHtml(initialHtml);
      } else {
        setSubject('');
        setHtml('');
      }
    } else {
      setSubject('');
      setHtml('');
    }
  }, [open, templateName, isEditMode, initialSubject, initialHtml]);

  const handleSave = async () => {
    if (!templateName.trim()) {
      return;
    }

    try {
      if (isEditMode && templateId) {
        await updateMutation.mutateAsync({
          id: templateId,
          subject: subject.trim(),
          html_body: html,
        });
        toast.success('Template updated successfully');
      } else {
        await createMutation.mutateAsync({
          name: templateName.trim(),
          subject: subject.trim(),
          html_body: html,
        });
      }
      onOpenChange(false);
      setTimeout(() => {
        setSubject('');
        setHtml('');
      }, 0);
    } catch (error) {
      // Error handling is done in the hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">Save Mail Template</DialogTitle>
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div>
            <p className="text-muted-foreground text-xs">Template Name</p>
            <p className="text-sm font-semibold">{templateName || '—'}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Close
          </Button>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <div>
            <label
              htmlFor="template-subject"
              className="text-muted-foreground mb-1 block text-xs"
            >
              Subject
            </label>
            <Input
              id="template-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject (optional)"
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              Body
            </label>
            <MinimalTiptap
              key={templateId || 'new'}
              content={html}
              onChange={setHtml}
              placeholder="Draft your reusable copy..."
            />
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-end gap-2 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || !templateName.trim()}
          >
            {isEditMode ? 'Update Template' : 'Save Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
