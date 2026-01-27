'use client';

import * as React from 'react';
import { ComposeEmailDialog } from '@/components/emails/ComposeEmailDialog';
import { useGetApplicationWithAgent } from '@/src/hooks/useGetApplicationWithAgent';
import { useGenerateInvoicePdf } from '@/src/hooks/useGenerateInvoicePdf';
import { useSendEmail } from '@/src/hooks/useSendEmail';
import { toast } from 'sonner';

type SendInvoiceComposeDialogProps = {
  invoiceId: string;
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SendInvoiceComposeDialog({
  invoiceId,
  applicationId,
  open,
  onOpenChange,
}: SendInvoiceComposeDialogProps) {
  const [selectedRecipient, setSelectedRecipient] = React.useState<string>('');
  const [initialAttachments, setInitialAttachments] = React.useState<
    Array<{ file: File; id: string }>
  >([]);

  const { mutateAsync: sendEmail } = useSendEmail();
  const generatePdfMutation = useGenerateInvoicePdf();

  // Fetch application with agent data
  const {
    data: application,
    isLoading: isLoadingApplication,
    error: applicationError,
  } = useGetApplicationWithAgent(applicationId);

  // Build recipient options based on available emails
  const recipientOptions = React.useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    if (application?.email) {
      options.push({
        value: application.email,
        label: `Student (${application.email})`,
      });
    }
    if (application?.agents?.contact_email) {
      options.push({
        value: application.agents.contact_email,
        label: `Agent (${application.agents.contact_email})`,
      });
    }
    return options;
  }, [application]);

  // Auto-select first recipient option when available
  React.useEffect(() => {
    if (open && recipientOptions.length > 0 && !selectedRecipient) {
      const firstOption = recipientOptions[0];
      setSelectedRecipient(firstOption.value);
    }
  }, [open, recipientOptions, selectedRecipient]);

  // Generate and attach invoice PDF when dialog opens
  React.useEffect(() => {
    if (open && invoiceId && initialAttachments.length === 0) {
      const generateAndAttachPdf = async () => {
        try {
          // Generate PDF by calling the API
          const res = await fetch(`/api/invoices/${invoiceId}/generate-pdf`, {
            method: 'POST',
          });

          if (!res.ok) {
            throw new Error('Failed to generate invoice PDF');
          }

          const blob = await res.blob();
          const file = new File([blob], `invoice-${invoiceId}.pdf`, {
            type: 'application/pdf',
          });

          setInitialAttachments([
            {
              file,
              id: `invoice-${invoiceId}-${Date.now()}`,
            },
          ]);
        } catch (error) {
          console.error('Failed to generate invoice PDF:', error);
          toast.error('Failed to generate invoice PDF');
        }
      };

      generateAndAttachPdf();
    }
  }, [open, invoiceId, initialAttachments.length]);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedRecipient('');
      setInitialAttachments([]);
    }
  }, [open]);

  const handleRecipientChange = (email: string) => {
    setSelectedRecipient(email);
  };

  const handleSend = async (emailData: {
    to: string[];
    subject: string;
    html: string;
    cc?: string[];
    bcc?: string[];
    attachments?: Array<{
      filename: string;
      content: string;
      contentType: string;
      size: number;
    }>;
  }) => {
    // Send the email
    await sendEmail({
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      cc: emailData.cc,
      bcc: emailData.bcc,
      attachments: emailData.attachments,
    });

    toast.success('Invoice sent successfully');
    onOpenChange(false);
  };

  const isLoading = isLoadingApplication;

  return (
    <ComposeEmailDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send Invoice"
      recipientMode="select"
      recipientOptions={recipientOptions}
      selectedRecipient={selectedRecipient}
      onRecipientChange={handleRecipientChange}
      initialAttachments={initialAttachments}
      onSend={handleSend}
      isLoading={isLoading}
      error={applicationError}
      loadingMessage="Loading invoice..."
      errorMessage={
        applicationError
          ? `Failed to load application: ${applicationError.message}`
          : undefined
      }
    />
  );
}
