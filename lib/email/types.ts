/**
 * Email Service Types
 * Industry-standard types for email sending with support for personalization
 */

export type EmailAttachment = {
  filename: string;
  content: string; // base64 encoded
  contentType: string;
  size: number;
};

export type EmailRecipient = {
  email: string;
  name?: string;
};

export type PersonalizedEmail = {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  replyTo?: string | string[];
  attachments?: EmailAttachment[];
  // Per-recipient personalization (optional)
  personalizations?: Array<{
    to: string;
    subject?: string;
    html?: string;
    text?: string;
  }>;
};

export type BulkEmailOptions = {
  from: string;
  recipients: EmailRecipient[];
  subject: string | ((recipient: EmailRecipient) => string);
  html: string | ((recipient: EmailRecipient) => string);
  text?: string | ((recipient: EmailRecipient) => string);
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  replyTo?: string | string[];
  attachments?: EmailAttachment[];
};

export type EmailSendResult = {
  success: boolean;
  emailIds: string[];
  resendIds: (string | null)[];
  failed?: Array<{
    recipient: string;
    error: string;
  }>;
};

export type EmailSendOptions = {
  from: string;
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  replyTo?: string | string[];
  attachments?: EmailAttachment[];
};
