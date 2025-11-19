'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type TemplateNameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (templateName: string) => void;
  initialName?: string;
};

/**
 * TemplateNameDialog
 *
 * Collects the template's display name before launching the compose dialog.
 * Provides basic validation and keyboard accessibility for a smooth flow.
 *
 * @param open Controls dialog visibility
 * @param onOpenChange Standard ShadCN dialog handler
 * @param onContinue Callback invoked with the sanitized template name
 * @param initialName Optional prefill value
 */
export const TemplateNameDialog = ({
  open,
  onOpenChange,
  onContinue,
  initialName = '',
}: TemplateNameDialogProps) => {
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setTouched(false);
    } else {
      setName('');
      setTouched(false);
    }
  }, [open, initialName]);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const showError = touched && trimmedName.length === 0;

  const handleContinue = () => {
    setTouched(true);
    if (!trimmedName) return;
    onContinue(trimmedName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="template-name-description">
        <DialogHeader>
          <DialogTitle>New Mail Template</DialogTitle>
          <DialogDescription id="template-name-description">
            Provide a descriptive name so teammates can quickly locate this
            template later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label
            htmlFor="template-name"
            className="text-sm leading-none font-medium"
          >
            Template Name
          </label>
          <Input
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. Offer Accepted Follow-up"
            aria-invalid={showError}
            aria-describedby={showError ? 'template-name-error' : undefined}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleContinue();
              }
            }}
          />
          {showError && (
            <p
              id="template-name-error"
              className="text-destructive text-sm font-medium"
            >
              Template name is required.
            </p>
          )}
        </div>
        <DialogFooter className="flex flex-row justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={!trimmedName}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
