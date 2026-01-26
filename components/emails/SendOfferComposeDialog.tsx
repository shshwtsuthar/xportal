'use client';

import * as React from 'react';
import { ComposeEmailDialog } from './ComposeEmailDialog';
import { useGetApplicationWithAgent } from '@/src/hooks/useGetApplicationWithAgent';
import { useDownloadOfferLetter } from '@/src/hooks/useDownloadOfferLetter';
import { useUpdateApplication } from '@/src/hooks/useUpdateApplication';
import { useSendEmail } from '@/src/hooks/useSendEmail';
import { toast } from 'sonner';

type SendOfferComposeDialogProps = {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SendOfferComposeDialog({
  applicationId,
  open,
  onOpenChange,
}: SendOfferComposeDialogProps) {
  const [selectedRecipient, setSelectedRecipient] = React.useState<string>('');
  const [initialAttachments, setInitialAttachments] = React.useState<
    Array<{ file: File; id: string }>
  >([]);

  const { mutateAsync: sendEmail } = useSendEmail();
  const updateApplicationMutation = useUpdateApplication();

  // Fetch application with agent data
  const {
    data: application,
    isLoading: isLoadingApplication,
    error: applicationError,
  } = useGetApplicationWithAgent(applicationId);

  // Fetch and download offer letter
  const {
    data: offerLetterFile,
    isLoading: isLoadingOfferLetter,
    error: offerLetterError,
  } = useDownloadOfferLetter(applicationId);

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

  // Attach offer letter when it's loaded
  React.useEffect(() => {
    if (open && offerLetterFile && initialAttachments.length === 0) {
      setInitialAttachments([
        {
          file: offerLetterFile,
          id: `offer-letter-${Date.now()}`,
        },
      ]);
    }
  }, [open, offerLetterFile, initialAttachments.length]);

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

    // Update application status to OFFER_SENT after successful email send
    try {
      await updateApplicationMutation.mutateAsync({
        id: applicationId,
        status: 'OFFER_SENT',
      });
    } catch (error) {
      // Log error but don't fail the entire operation since email was sent successfully
      console.error('Failed to update application status:', error);
      toast.error('Email sent but failed to update application status');
    }

    // Create application invoices for deposits
    try {
      const invoiceRes = await fetch('/api/create-application-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      });

      if (!invoiceRes.ok) {
        const errorData = await invoiceRes.json().catch(() => ({}));
        console.error(
          'Failed to create application invoices:',
          errorData.error || invoiceRes.statusText
        );
        // Don't show error toast - invoice creation is non-critical
      } else {
        const data = await invoiceRes.json();
        if (data.count > 0) {
          console.log(
            `Created ${data.count} application invoice(s) for deposits`
          );
        }
      }
    } catch (error) {
      // Log but don't fail - invoice creation is non-critical
      console.error('Error creating application invoices:', error);
    }

    onOpenChange(false);
  };

  const isLoading = isLoadingApplication || isLoadingOfferLetter;
  const error = applicationError || offerLetterError;

  return (
    <ComposeEmailDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send Offer Letter"
      recipientMode="select"
      recipientOptions={recipientOptions}
      selectedRecipient={selectedRecipient}
      onRecipientChange={handleRecipientChange}
      initialAttachments={initialAttachments}
      onSend={handleSend}
      isLoading={isLoading}
      error={error}
      loadingMessage="Loading offer letter..."
      errorMessage={
        applicationError
          ? `Failed to load application: ${applicationError.message}`
          : offerLetterError
            ? `Failed to load offer letter: ${offerLetterError.message}`
            : undefined
      }
    />
  );
}
