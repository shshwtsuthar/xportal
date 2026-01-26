/**
 * Smart Email Service
 * Automatically selects the best sending method based on recipient count:
 * - 1 recipient: Regular /emails endpoint (no batch overhead)
 * - 2-100 recipients: Batch /emails/batch endpoint
 * - 100+ recipients: Multiple batch calls (100 per batch)
 */

import { Resend } from 'resend';
import type {
  EmailSendOptions,
  EmailSendResult,
  BulkEmailOptions,
  EmailRecipient,
  EmailAttachment,
} from './types';

const RESEND_MAX_RECIPIENTS_PER_FIELD = 50;
const RESEND_MAX_BATCH_SIZE = 100;
const RESEND_RATE_LIMIT_DELAY_MS = 500; // 2 req/sec = 500ms between requests

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    if (!apiKey) {
      throw new Error('Resend API key is required');
    }
    if (!fromEmail) {
      throw new Error('From email is required');
    }
    this.resend = new Resend(apiKey);
    this.fromEmail = fromEmail;
  }

  /**
   * Validates email address format
   */
  private isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  /**
   * Normalizes recipients to array format
   */
  private normalizeRecipients(
    recipients: EmailRecipient | EmailRecipient[] | string | string[]
  ): EmailRecipient[] {
    const arr = Array.isArray(recipients) ? recipients : [recipients];
    return arr
      .map((r): EmailRecipient | null => {
        if (typeof r === 'string') {
          return { email: r.trim() };
        }
        return { email: r.email.trim(), name: r.name };
      })
      .filter(
        (r): r is EmailRecipient =>
          r !== null && r.email.length > 0 && this.isValidEmail(r.email)
      );
  }

  /**
   * Formats recipient for Resend API
   */
  private formatRecipient(recipient: EmailRecipient): string {
    return recipient.name
      ? `${recipient.name} <${recipient.email}>`
      : recipient.email;
  }

  /**
   * Converts attachments to Resend format
   */
  private formatAttachments(
    attachments?: EmailAttachment[]
  ): Array<{ filename: string; content: Buffer }> | undefined {
    if (!attachments || attachments.length === 0) {
      return undefined;
    }

    return attachments.map((att) => ({
      filename: att.filename,
      content: Buffer.from(att.content, 'base64'),
    }));
  }

  /**
   * Sends a single email using regular endpoint
   */
  private async sendSingleEmail(
    options: EmailSendOptions
  ): Promise<{ id: string | null }> {
    const to = this.normalizeRecipients(options.to);
    if (to.length === 0) {
      throw new Error('No valid recipients');
    }

    // For single email, use first recipient
    const recipient = to[0];
    const cc = options.cc ? this.normalizeRecipients(options.cc) : [];
    const bcc = options.bcc ? this.normalizeRecipients(options.bcc) : [];

    // Validate limits
    if (cc.length > RESEND_MAX_RECIPIENTS_PER_FIELD) {
      throw new Error(
        `CC recipients exceed limit of ${RESEND_MAX_RECIPIENTS_PER_FIELD}`
      );
    }
    if (bcc.length > RESEND_MAX_RECIPIENTS_PER_FIELD) {
      throw new Error(
        `BCC recipients exceed limit of ${RESEND_MAX_RECIPIENTS_PER_FIELD}`
      );
    }

    const { data, error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: this.formatRecipient(recipient),
      subject: options.subject,
      html: options.html,
      text: options.text,
      cc: cc.length > 0 ? cc.map(this.formatRecipient) : undefined,
      bcc: bcc.length > 0 ? bcc.map(this.formatRecipient) : undefined,
      replyTo: options.replyTo,
      attachments: this.formatAttachments(options.attachments),
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { id: data?.id ?? null };
  }

  /**
   * Sends emails using batch endpoint
   * Note: Batch API doesn't support attachments
   */
  private async sendBatchEmails(
    emails: Array<{
      to: string;
      subject: string;
      html: string;
      text?: string;
      cc?: string[];
      bcc?: string[];
      replyTo?: string | string[];
    }>
  ): Promise<Array<{ id: string | null }>> {
    if (emails.length === 0) {
      return [];
    }

    if (emails.length > RESEND_MAX_BATCH_SIZE) {
      throw new Error(
        `Batch size exceeds limit of ${RESEND_MAX_BATCH_SIZE} emails`
      );
    }

    const batchPayload = emails.map((email) => ({
      from: this.fromEmail,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      cc: email.cc,
      bcc: email.bcc,
      replyTo: email.replyTo,
    }));

    const { data, error } = await this.resend.batch.send(batchPayload);

    if (error) {
      throw new Error(`Failed to send batch emails: ${error.message}`);
    }

    // Resend SDK returns { data: { data: [...] } } structure
    // Handle both possible response formats
    let emailArray: Array<{ id?: string }> = [];

    if (data) {
      if (Array.isArray(data)) {
        // Direct array response
        emailArray = data;
      } else if (data.data && Array.isArray(data.data)) {
        // Nested data structure: { data: [...] }
        emailArray = data.data;
      } else {
        throw new Error(
          `Unexpected batch response format: expected array or { data: array }, got ${typeof data}`
        );
      }
    }

    return emailArray.map((item) => ({ id: item?.id ?? null }));
  }

  /**
   * Smart email sending - automatically chooses best method
   */
  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    const recipients = this.normalizeRecipients(options.to);
    const cc = options.cc ? this.normalizeRecipients(options.cc) : [];
    const bcc = options.bcc ? this.normalizeRecipients(options.bcc) : [];

    if (recipients.length === 0) {
      throw new Error('No valid recipients');
    }

    // Validate CC/BCC limits
    if (cc.length > RESEND_MAX_RECIPIENTS_PER_FIELD) {
      throw new Error(
        `CC recipients exceed limit of ${RESEND_MAX_RECIPIENTS_PER_FIELD}`
      );
    }
    if (bcc.length > RESEND_MAX_RECIPIENTS_PER_FIELD) {
      throw new Error(
        `BCC recipients exceed limit of ${RESEND_MAX_RECIPIENTS_PER_FIELD}`
      );
    }

    // Check if attachments are present - batch API doesn't support attachments
    const hasAttachments =
      options.attachments && options.attachments.length > 0;

    // Strategy 1: Single recipient - use regular endpoint
    if (recipients.length === 1) {
      try {
        const result = await this.sendSingleEmail(options);
        return {
          success: true,
          emailIds: [],
          resendIds: [result.id],
        };
      } catch (error) {
        return {
          success: false,
          emailIds: [],
          resendIds: [],
          failed: [
            {
              recipient: recipients[0].email,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          ],
        };
      }
    }

    // Strategy 2: Multiple recipients with attachments - must use individual sends
    // (Batch API doesn't support attachments)
    if (hasAttachments) {
      const results: Array<{ id: string | null }> = [];
      const failed: Array<{ recipient: string; error: string }> = [];

      for (const recipient of recipients) {
        try {
          const result = await this.sendSingleEmail({
            ...options,
            to: recipient,
          });
          results.push(result);
        } catch (error) {
          failed.push({
            recipient: recipient.email,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        // Rate limiting: add delay between sends
        if (recipients.indexOf(recipient) < recipients.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, RESEND_RATE_LIMIT_DELAY_MS)
          );
        }
      }

      return {
        success: failed.length === 0,
        emailIds: [],
        resendIds: results.map((r) => r.id),
        failed: failed.length > 0 ? failed : undefined,
      };
    }

    // Strategy 3: 2-100 recipients without attachments - use batch endpoint
    if (recipients.length <= RESEND_MAX_BATCH_SIZE) {
      try {
        const emails = recipients.map((recipient) => ({
          to: this.formatRecipient(recipient),
          subject: options.subject,
          html: options.html,
          text: options.text,
          cc: cc.length > 0 ? cc.map(this.formatRecipient) : undefined,
          bcc: bcc.length > 0 ? bcc.map(this.formatRecipient) : undefined,
          replyTo: options.replyTo,
        }));

        const results = await this.sendBatchEmails(emails);
        return {
          success: true,
          emailIds: [],
          resendIds: results.map((r) => r.id),
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return {
          success: false,
          emailIds: [],
          resendIds: [],
          failed: recipients.map((r) => ({
            recipient: r.email,
            error: errorMessage,
          })),
        };
      }
    }

    // Strategy 4: 100+ recipients without attachments - split into multiple batches
    const batches: EmailRecipient[][] = [];
    for (let i = 0; i < recipients.length; i += RESEND_MAX_BATCH_SIZE) {
      batches.push(recipients.slice(i, i + RESEND_MAX_BATCH_SIZE));
    }

    const allResults: Array<{ id: string | null }> = [];
    const failed: Array<{ recipient: string; error: string }> = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Rate limiting: add delay between batches (except first)
      if (i > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, RESEND_RATE_LIMIT_DELAY_MS)
        );
      }

      try {
        const emails = batch.map((recipient) => ({
          to: this.formatRecipient(recipient),
          subject: options.subject,
          html: options.html,
          text: options.text,
          cc: cc.length > 0 ? cc.map(this.formatRecipient) : undefined,
          bcc: bcc.length > 0 ? bcc.map(this.formatRecipient) : undefined,
          replyTo: options.replyTo,
        }));

        const results = await this.sendBatchEmails(emails);
        allResults.push(...results);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        batch.forEach((recipient) => {
          failed.push({
            recipient: recipient.email,
            error: errorMsg,
          });
        });
      }
    }

    return {
      success: failed.length === 0,
      emailIds: [],
      resendIds: allResults.map((r) => r.id),
      failed: failed.length > 0 ? failed : undefined,
    };
  }

  /**
   * Send bulk emails with personalization support
   */
  async sendBulk(options: BulkEmailOptions): Promise<EmailSendResult> {
    const recipients = this.normalizeRecipients(options.recipients);

    if (recipients.length === 0) {
      throw new Error('No valid recipients');
    }

    // Check if attachments are present - batch API doesn't support attachments
    const hasAttachments =
      options.attachments && options.attachments.length > 0;

    // Build personalized emails
    const personalizedEmails = recipients.map((recipient) => {
      const subject =
        typeof options.subject === 'function'
          ? options.subject(recipient)
          : options.subject;
      const html =
        typeof options.html === 'function'
          ? options.html(recipient)
          : options.html;
      const text =
        typeof options.text === 'function'
          ? options.text(recipient)
          : options.text;

      return {
        recipient,
        to: this.formatRecipient(recipient),
        subject,
        html,
        text,
        cc: options.cc ? options.cc.map(this.formatRecipient) : undefined,
        bcc: options.bcc ? options.bcc.map(this.formatRecipient) : undefined,
        replyTo: options.replyTo,
      };
    });

    // If attachments exist, must use individual sends
    if (hasAttachments) {
      const results: Array<{ id: string | null }> = [];
      const failed: Array<{ recipient: string; error: string }> = [];

      for (let i = 0; i < personalizedEmails.length; i++) {
        const email = personalizedEmails[i];

        try {
          const result = await this.sendSingleEmail({
            from: this.fromEmail,
            to: email.recipient,
            subject: email.subject,
            html: email.html,
            text: email.text,
            cc: options.cc,
            bcc: options.bcc,
            replyTo: options.replyTo,
            attachments: options.attachments,
          });
          results.push(result);
        } catch (error) {
          failed.push({
            recipient: email.recipient.email,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        // Rate limiting
        if (i < personalizedEmails.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, RESEND_RATE_LIMIT_DELAY_MS)
          );
        }
      }

      return {
        success: failed.length === 0,
        emailIds: [],
        resendIds: results.map((r) => r.id),
        failed: failed.length > 0 ? failed : undefined,
      };
    }

    // Split into batches if needed
    const batches: (typeof personalizedEmails)[] = [];
    for (let i = 0; i < personalizedEmails.length; i += RESEND_MAX_BATCH_SIZE) {
      batches.push(personalizedEmails.slice(i, i + RESEND_MAX_BATCH_SIZE));
    }

    const allResults: Array<{ id: string | null }> = [];
    const failed: Array<{ recipient: string; error: string }> = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Rate limiting: add delay between batches (except first)
      if (i > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, RESEND_RATE_LIMIT_DELAY_MS)
        );
      }

      try {
        const batchPayload = batch.map((email) => ({
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          cc: email.cc,
          bcc: email.bcc,
          replyTo: email.replyTo,
        }));

        const results = await this.sendBatchEmails(batchPayload);
        allResults.push(...results);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        batch.forEach((email) => {
          failed.push({
            recipient: email.to,
            error: errorMsg,
          });
        });
      }
    }

    return {
      success: failed.length === 0,
      emailIds: [],
      resendIds: allResults.map((r) => r.id),
      failed: failed.length > 0 ? failed : undefined,
    };
  }
}

/**
 * Creates an EmailService instance
 */
export function createEmailService(
  apiKey: string,
  fromEmail: string
): EmailService {
  return new EmailService(apiKey, fromEmail);
}
