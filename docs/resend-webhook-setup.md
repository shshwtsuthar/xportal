# Resend Webhook Configuration Guide

This guide explains how to configure Resend webhooks to automatically update email statuses in XPortal when emails are delivered, bounced, or marked as spam.

## Prerequisites

- A Resend account with API access
- Your XPortal deployment URL (e.g., `https://yourdomain.com`)
- Access to your environment variables

## Step 1: Create Webhook in Resend Dashboard

1. Log in to your [Resend Dashboard](https://resend.com/dashboard)
2. Navigate to **Webhooks** (or **Settings** → **Webhooks**)
3. Click **Create Webhook** or **Add Webhook**
4. Fill in the webhook details:
   - **Endpoint URL**: `https://yourdomain.com/api/webhooks/resend`
     - Replace `yourdomain.com` with your actual deployment domain
     - Example: `https://xportal.example.com/api/webhooks/resend`
   - **Events**: Select the following events:
     - ✅ `email.sent`
     - ✅ `email.delivered`
     - ✅ `email.bounced`
     - ✅ `email.complained`
     - (Optional) `email.delivery_delayed`
5. Save the webhook

## Step 2: Get the Signing Secret

After creating the webhook, Resend will provide you with a **Signing Secret**:

1. In the Resend Dashboard, go to your webhook details page
2. Find the **Signing Secret** (it will look like `whsec_xxxxxxxxxx` or similar)
3. **Copy this secret** - you'll need it in the next step

**Important:** 
- This secret is unique to each webhook endpoint
- Never commit this secret to version control
- Rotate the secret if it's ever compromised (you can regenerate it in Resend)

## Step 3: Add Environment Variable

Add the signing secret to your deployment environment:

```bash
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxx
```

Replace `whsec_xxxxxxxxxx` with the actual signing secret from Resend.

### Via Resend API

If you prefer to configure the webhook programmatically, use the Resend API:

```bash
curl -X POST 'https://api.resend.com/webhooks' \
  -H 'Authorization: Bearer re_YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "endpoint": "https://yourdomain.com/api/webhooks/resend",
    "events": ["email.sent", "email.delivered", "email.bounced", "email.complained"]
  }'
```

**Note:** After creating the webhook via API, you'll still need to retrieve the signing secret from the webhook details page in the Resend Dashboard.

## Step 4: Verify Webhook Configuration

**Note:** Manual testing of webhook endpoints with signature verification is complex because Resend uses cryptographic signatures (Svix) that require the exact payload and headers. The best way to verify is to send a real email and check the logs.

1. **Send a test email** from XPortal using the Compose dialog
2. **Check the Mail page** (`/communications/mail`) to verify:
   - The email appears in the list with status `SENT`
   - After delivery, the status updates to `DELIVERED` (if webhook receives the event)
   - The stats cards reflect the new counts

## Step 5: Monitor Webhook Events

### Check Webhook Logs in Resend

1. Go to your Resend Dashboard
2. Navigate to **Webhooks** → Select your webhook
3. View the **Logs** or **Events** tab to see:
   - Successful deliveries (200 status)
   - Failed attempts (401, 500, etc.)
   - Event payloads

### Check Your Application Logs

Monitor your deployment logs for:
- Successful webhook requests (200 responses)
- Authentication failures (401 - check `RESEND_WEBHOOK_SECRET`)
- Server errors (500 - check database connectivity, RLS policies)

## Troubleshooting

### Webhook returns 401 Unauthorized / Invalid webhook signature

**Cause:** The webhook signature verification failed. This can happen if:
- The `RESEND_WEBHOOK_SECRET` doesn't match the signing secret from Resend
- The request body was modified (parsed and re-stringified) before verification
- The Svix headers are missing or incorrect

**Solution:**
1. Verify `RESEND_WEBHOOK_SECRET` matches the signing secret from your Resend webhook details page exactly
2. Ensure you're using the raw request body for verification (not parsed JSON)
3. Check that your Next.js route handler is reading the raw body with `req.text()` before verification
4. Restart your application after updating the environment variable
5. Verify the Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`) are present in the request

### Webhook returns 200 but statuses don't update

**Cause:** Email message not found by `resend_message_id`

**Solution:**
1. Verify the email was sent through XPortal (check `email_messages` table)
2. Check that `resend_message_id` was saved correctly
3. Verify the `email_id` in the webhook payload matches `resend_message_id`

### Status updates but events aren't logged

**Cause:** Database insert failure for `email_message_status_events`

**Solution:**
1. Check RLS policies allow inserts for authenticated users (webhook uses admin client)
2. Verify database connectivity
3. Check application logs for SQL errors

### Webhook not receiving events

**Cause:** Resend webhook not configured or disabled

**Solution:**
1. Verify webhook is active in Resend Dashboard
2. Check the endpoint URL is correct and publicly accessible
3. Send a test email from XPortal and check Resend webhook logs for delivery attempts
4. Verify your deployment is accessible from the internet (not behind a firewall blocking Resend's IPs)

## Security Best Practices

1. **Use HTTPS:** Always use HTTPS for webhook endpoints (never HTTP)
2. **Verify signatures:** Always verify webhook signatures using the signing secret (already implemented)
3. **Rotate secrets:** Regenerate the signing secret in Resend periodically and update `RESEND_WEBHOOK_SECRET`
4. **Monitor logs:** Regularly check webhook logs for suspicious activity
5. **Use raw body:** The implementation uses the raw request body for signature verification, which is required for cryptographic validation
6. **Validate payloads:** The current implementation validates signatures and checks for required fields

## Next Steps

After webhook configuration:
1. ✅ Test sending emails and verify status updates
2. ✅ Monitor the Mail page stats cards for accurate counts
3. ✅ Review webhook logs periodically to ensure reliability
4. ✅ Document your webhook URL and secret in your team's secure password manager

## Additional Resources

- [Resend Webhooks Documentation](https://resend.com/docs/webhooks)
- [Resend Event Types](https://resend.com/docs/webhooks/event-types)
- [Resend API Reference](https://resend.com/docs/api-reference)

