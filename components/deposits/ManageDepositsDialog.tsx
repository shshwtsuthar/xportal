'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { CreateInvoicesStep } from './CreateInvoicesStep';
import { ManageInvoicesStep } from './ManageInvoicesStep';
import { useGetApplicationInvoicesByApplication } from '@/src/hooks/useGetApplicationInvoicesByApplication';

type ManageDepositsDialogProps = {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Step = 'create' | 'manage';

export function ManageDepositsDialog({
  applicationId,
  open,
  onOpenChange,
}: ManageDepositsDialogProps) {
  const [step, setStep] = React.useState<Step>('create');

  // Check if invoices already exist
  const { data: existingInvoices, isLoading: isLoadingInvoices } =
    useGetApplicationInvoicesByApplication(applicationId);

  // Determine initial step based on whether invoices exist
  React.useEffect(() => {
    if (open && !isLoadingInvoices) {
      if (existingInvoices && existingInvoices.length > 0) {
        setStep('manage');
      } else {
        setStep('create');
      }
    }
  }, [open, existingInvoices, isLoadingInvoices]);

  // Reset step when dialog closes
  React.useEffect(() => {
    if (!open) {
      setStep('create');
    }
  }, [open]);

  const handleInvoicesCreated = () => {
    setStep('manage');
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Manage Deposit Invoices
          </DialogTitle>
          <DialogDescription>
            {step === 'create'
              ? 'Create deposit invoices for this application based on configured installments.'
              : 'View and manage existing deposit invoices. Generate PDFs or send them via email.'}
          </DialogDescription>
        </DialogHeader>

        {isLoadingInvoices ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              <p className="text-muted-foreground text-sm">
                Loading invoices...
              </p>
            </div>
          </div>
        ) : step === 'create' ? (
          <CreateInvoicesStep
            applicationId={applicationId}
            onInvoicesCreated={handleInvoicesCreated}
            onClose={handleClose}
          />
        ) : (
          <ManageInvoicesStep
            applicationId={applicationId}
            invoices={existingInvoices ?? []}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
