# Test script for daily-finance-tick edge function
# Usage: .\scripts\test-daily-finance-tick.ps1

# Get Supabase URL and keys from environment or supabase status
$SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
$SUPABASE_ANON_KEY = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY

if (-not $SUPABASE_URL) {
    Write-Host "Error: NEXT_PUBLIC_SUPABASE_URL not set." -ForegroundColor Red
    Write-Host "Please set it in your .env.local file or run 'supabase status' to get the URL." -ForegroundColor Yellow
    exit 1
}

if (-not $SUPABASE_ANON_KEY) {
    Write-Host "Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not set." -ForegroundColor Red
    Write-Host "Please set it in your .env.local file or run 'supabase status' to get the key." -ForegroundColor Yellow
    exit 1
}

# Construct the function URL
$functionUrl = "$SUPABASE_URL/functions/v1/daily-finance-tick"

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
}

Write-Host "Testing daily-finance-tick function..." -ForegroundColor Cyan
Write-Host "URL: $functionUrl" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $functionUrl `
        -Method POST `
        -Headers $headers
    
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10)
    
    if ($response.ok -and $response.processed -ge 0) {
        Write-Host ""
        Write-Host "Processed $($response.processed) invoice(s)" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Error occurred" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Error Details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Yellow
    }
    
    exit 1
}

