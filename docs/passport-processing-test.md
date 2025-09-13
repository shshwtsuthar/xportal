# Passport Processing Test Guide

## Overview
This document outlines how to test the passport processing feature that automatically extracts data from passport documents using Mindee API.

## Prerequisites
1. Ensure Supabase is running locally: `supabase start`
2. Ensure Edge Functions are running: `supabase functions serve`
3. Ensure the application is running: `npm run dev`

## Test Steps

### 1. Environment Setup
- Verify that `.env.local` contains the Mindee API configuration:
  ```
  MINDEE_API_KEY=md_LSZfAWkPt0nh48pCuwyg0QYeqApGjgQS
  MINDEE_MODEL_ID=1c36496a-ad46-4a74-b939-3d56aa61ccfa
  ```

### 2. Test Passport Upload
1. Navigate to `/students/new` to start a new application
2. In Step 1 (Document Upload), upload a file with "passport" in the filename
3. The system should:
   - Detect the file as a passport
   - Automatically process it with Mindee API
   - Show a success notification with extracted fields
   - Display emoji indicators (✅) next to auto-filled fields in Step 2

### 3. Expected Behavior

#### File Detection
- Files with "passport" in the name should trigger processing
- Files without "passport" in the name should upload normally without processing

#### Data Extraction
The system should extract and auto-fill:
- **Personal Details:**
  - First Name ✅
  - Last Name ✅
  - Gender ✅
  - Date of Birth ✅

- **For International Students:**
  - Passport Number ✅
  - Issuing Country ✅
  - Date of Expiry ✅

- **Additional Data:**
  - Nationality (for country mapping)
  - Place of Birth
  - Date of Issue
  - MRZ data (stored for reference)

#### UI Feedback
- **Step 1:** Green success card showing extracted data
- **Step 2:** Green checkmark emojis (✅) next to auto-filled fields
- **Error Handling:** Graceful fallback if processing fails

### 4. Test Cases

#### Test Case 1: Valid Passport
1. Upload a file named "passport_scan.pdf"
2. Verify processing starts automatically
3. Check that extracted data appears in Step 1
4. Navigate to Step 2 and verify emoji indicators
5. Verify data is pre-filled in form fields

#### Test Case 2: Non-Passport File
1. Upload a file named "transcript.pdf"
2. Verify no processing occurs
3. Verify normal upload behavior

#### Test Case 3: Processing Failure
1. Upload a corrupted passport file
2. Verify graceful error handling
3. Verify upload still succeeds
4. Verify no data extraction occurs

#### Test Case 4: Partial Data Extraction
1. Upload a passport with unclear text
2. Verify only clear fields are extracted
3. Verify unclear fields are skipped
4. Verify UI shows only successfully extracted fields

### 5. Troubleshooting

#### Common Issues
1. **Mindee API Error:** Check API key and model ID
2. **Processing Not Triggered:** Ensure filename contains "passport"
3. **Data Not Auto-filled:** Check browser console for errors
4. **UI Not Updating:** Verify React state updates

#### Debug Steps
1. Check browser console for error messages
2. Check Supabase Edge Function logs: `supabase functions logs passport-process`
3. Verify Mindee API response in network tab
4. Check application state in Redux DevTools

### 6. Expected API Response
```json
{
  "message": "Passport processed successfully",
  "extractedData": {
    "firstName": "SIMRAN",
    "lastName": "KAUR",
    "gender": "Female",
    "dateOfBirth": "1997-06-12",
    "nationality": "INDIAN",
    "placeOfBirth": "PUNJAB",
    "passportNumber": "N6975116",
    "issuingCountry": "IND",
    "dateOfIssue": "2016-02-01",
    "dateOfExpiry": "2026-02-09"
  },
  "fieldsExtracted": [
    "firstName",
    "lastName", 
    "gender",
    "dateOfBirth",
    "nationality",
    "placeOfBirth",
    "passportNumber",
    "issuingCountry",
    "dateOfIssue",
    "dateOfExpiry"
  ]
}
```

## Success Criteria
- ✅ Passport files are automatically detected and processed
- ✅ Extracted data is displayed in Step 1 with success notification
- ✅ Form fields in Step 2 show emoji indicators for auto-filled data
- ✅ Data is properly mapped to application form fields
- ✅ Error handling works gracefully
- ✅ Non-passport files upload normally without processing
- ✅ Partial data extraction works correctly
