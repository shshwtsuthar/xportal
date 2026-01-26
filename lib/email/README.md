# Smart Email Service

An industry-standard email sending service that automatically selects the optimal sending method based on recipient count and email characteristics.

## Features

### 🎯 Automatic Method Selection

The service intelligently chooses the best sending method:

- **1 recipient** → Regular `/emails` endpoint (no batch overhead)
- **2-100 recipients** → Batch `/emails/batch` endpoint (efficient)
- **100+ recipients** → Multiple batch calls (100 per batch)
- **With attachments** → Individual sends (batch API doesn't support attachments)

### ✨ Key Capabilities

- **Personalization Support**: Per-recipient subject/html via `sendBulk()`
- **Rate Limiting**: Automatic 500ms delay between batches (respects 2 req/sec limit)
- **Error Handling**: Partial failure tracking per recipient
- **Validation**: Email format validation, recipient limits (50 per field)
- **Attachment Support**: Handles attachments with proper validation

## Usage

### Basic Email Sending

```typescript
import { createEmailService } from '@/lib/email/service';

const emailService = createEmailService(apiKey, fromEmail);

// Single email (uses regular endpoint)
await emailService.send({
  from: 'org@domain.com',
  to: 'student@example.com',
  subject: 'Hello',
  html: '<p>Hi!</p>'
});

// Multiple recipients (automatically uses batch)
await emailService.send({
  from: 'org@domain.com',
  to: ['student1@example.com', 'student2@example.com', ...],
  subject: 'Hello',
  html: '<p>Hi!</p>'
});
```

### Bulk Personalized Emails

```typescript
// Send to 500 applicants with personalization
await emailService.sendBulk({
  from: 'org@domain.com',
  recipients: applicants,
  subject: (recipient) => `Hello ${recipient.name}`,
  html: (recipient) => `<p>Hi ${recipient.name}!</p>`
});
```

## API Route Integration

The `/api/emails/send` route automatically uses this service. It maintains:
- Database tracking for all emails
- Participant tracking (TO/CC/BCC)
- Attachment tracking
- Status events
- Metadata storage

## Limits

- **To/CC/BCC**: Max 50 recipients per field (Resend API limit)
- **Batch Size**: Max 100 emails per batch
- **Attachments**: Max 10 files, 10MB each
- **Rate Limit**: 2 requests/second (with automatic delays)

## Best Practices

1. **Single Recipient**: Use regular endpoint (no batch overhead)
2. **Multiple Recipients**: Let the service choose batch automatically
3. **Personalization**: Use `sendBulk()` for per-recipient customization
4. **Privacy**: For bulk sends, each recipient only sees their own email
5. **Attachments**: Be aware that attachments force individual sends
