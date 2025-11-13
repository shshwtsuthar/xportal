# Testing the Daily Finance Tick Function Locally

The `daily-finance-tick` edge function is responsible for:
1. Promoting `SCHEDULED` invoices to `SENT` status (for invoices due within 7 days)
2. Generating PDF invoices for invoices due today that don't have a PDF yet
3. Sending email notifications to students for invoices due today

## Prerequisites

1. Ensure Supabase is running locally:
   ```bash
   supabase start
   ```

2. Ensure edge functions server is running:
   ```bash
   supabase functions serve --no-verify-jwt
   ```

   This will start the edge functions server, typically on port `54321`.

## Testing Methods

### Method 1: Using curl (Recommended)

```bash
curl -X POST http://localhost:54321/functions/v1/daily-finance-tick \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

**Note:** Replace `YOUR_SUPABASE_ANON_KEY` with your actual anon key. You can get it by running:
```bash
supabase status
```

### Method 2: Using PowerShell (Windows)

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_SUPABASE_ANON_KEY"
}

Invoke-RestMethod -Uri "http://localhost:54321/functions/v1/daily-finance-tick" `
    -Method POST `
    -Headers $headers
```

### Method 3: Using a Test Script

Create a file `scripts/test-daily-finance-tick.ps1`:

```powershell
# Get Supabase URL and keys from environment or supabase status
$SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
$SUPABASE_ANON_KEY = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY

if (-not $SUPABASE_URL) {
    Write-Host "Error: NEXT_PUBLIC_SUPABASE_URL not set. Run 'supabase status' to get values."
    exit 1
}

if (-not $SUPABASE_ANON_KEY) {
    Write-Host "Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not set. Run 'supabase status' to get values."
    exit 1
}

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
}

Write-Host "Calling daily-finance-tick function..."
try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/daily-finance-tick" `
        -Method POST `
        -Headers $headers
    
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 10)"
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
```

Then run:
```powershell
.\scripts\test-daily-finance-tick.ps1
```

### Method 4: Using Browser DevTools or Postman

1. **URL:** `http://localhost:54321/functions/v1/daily-finance-tick`
2. **Method:** POST
3. **Headers:**
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
4. **Body:** (empty JSON object or omit body)

## What to Expect

### Success Response
```json
{
  "ok": true,
  "processed": 2
}
```

Where `processed` is the number of invoices that were processed (PDFs generated and/or emails sent).

### Error Response
```json
{
  "error": "Error message here"
}
```

## Verifying Results

After running the function, check:

1. **Database:** Query the `invoices` table to see if:
   - `SCHEDULED` invoices within 7 days have been promoted to `SENT`
   - Invoices due today have `pdf_path` populated
   - `last_email_sent_at` is updated for invoices that were emailed

2. **Storage:** Check the `invoices` storage bucket for generated PDFs:
   ```sql
   -- In Supabase Studio SQL Editor
   SELECT * FROM storage.objects WHERE bucket_id = 'invoices';
   ```

3. **Email:** If `RESEND_API_KEY` is configured, check your email inbox (or Resend dashboard) for sent emails.

## Troubleshooting

### Function Not Found (404)
- Ensure `supabase functions serve` is running
- Check that the function name is correct: `daily-finance-tick`
- Verify the port (default is `54321`)

### Authentication Errors (401)
- Ensure you're using the correct `SUPABASE_ANON_KEY`
- Check that the key is properly set in your environment or passed in the header

### No Invoices Processed
- Check if there are any invoices due today: `SELECT * FROM invoices WHERE due_date = CURRENT_DATE;`
- Verify invoices don't already have `pdf_path` set (function only processes invoices without PDFs)
- Check function logs for any errors

### PDF Generation Fails
- Ensure the `invoices` storage bucket exists
- Check RLS policies allow the service role to write to storage
- Verify the invoice has all required data (enrollment, student, RTO)

## Scheduling in Production

In production, this function should be scheduled to run daily using:
- **Supabase Cron Jobs** (pg_cron extension)
- **External cron service** (e.g., cron-job.org, GitHub Actions)
- **Cloud scheduler** (e.g., AWS EventBridge, Google Cloud Scheduler)

Example pg_cron schedule:
```sql
SELECT cron.schedule(
  'daily-finance-tick',
  '0 9 * * *', -- Run daily at 9 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/daily-finance-tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);
```

