# 🚀 XPortal SMS API - Postman Battle Testing Guide

## 📋 Overview

This guide provides comprehensive instructions for battle testing all XPortal SMS API endpoints using Postman. The collection includes automated tests, environment variables, and error handling scenarios.

## 🔧 Setup Instructions

### 1. Import the Collection

1. Open Postman
2. Click **Import** button
3. Select `postman-collection.json` from your project root
4. The collection will be imported with all endpoints and tests

### 2. Environment Variables

The collection includes these pre-configured environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `base_url` | `http://127.0.0.1:54321/functions/v1` | Local Supabase functions URL |
| `anon_key` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase anonymous key |
| `service_key` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase service role key |

### 3. Start Supabase Local Development

```bash
# Make sure Supabase is running locally
supabase start

# Verify status
supabase status
```

## 🎯 Testing Strategy

### Phase 1: Health Check
- **Smoke Test**: Verify API is responding
- **Expected**: 200 status with health message

### Phase 2: Data Retrieval Endpoints
- **Programs**: List all programs, get by ID, list subjects
- **Course Offerings**: List offerings, get by ID
- **Agents**: List active agents
- **Reference Data**: All AVETMISS reference codes
- **Clients**: List clients, get by ID

### Phase 3: Data Modification Endpoints
- **Client Updates**: Update client information
- **Application Creation**: Create new applications
- **Application Management**: Get, list, approve applications

### Phase 4: Error Handling
- **Invalid UUIDs**: Test with malformed UUIDs
- **Non-existent Resources**: Test 404 scenarios
- **Invalid Parameters**: Test 400 scenarios

## 📊 Test Coverage

### ✅ Automated Tests Include:

1. **Response Time**: All requests must complete within 5 seconds
2. **JSON Validation**: All responses must be valid JSON
3. **Status Codes**: Correct HTTP status codes for each endpoint
4. **Required Fields**: All responses have expected fields
5. **Data Types**: Proper data types for all fields
6. **Error Handling**: Proper error responses for invalid requests

### 🔄 Dynamic Test Data:

The collection automatically:
- Stores program IDs from list responses
- Stores course offering IDs for application creation
- Stores agent IDs for application creation
- Stores application IDs for subsequent operations
- Stores client IDs for updates

## 🚀 Running Tests

### Option 1: Run Individual Tests
1. Select any request in the collection
2. Click **Send**
3. View test results in the **Test Results** tab

### Option 2: Run Collection Tests
1. Right-click on the collection name
2. Select **Run collection**
3. Configure test run settings
4. Click **Run XPortal SMS API - Battle Testing**

### Option 3: Run Specific Folder Tests
1. Right-click on any folder (e.g., "📚 Programs & Subjects")
2. Select **Run collection**
3. Only tests in that folder will run

## 📈 Test Results Interpretation

### ✅ Success Indicators:
- **Green checkmarks** for all tests
- **Response times** under 5000ms
- **Status codes** match expected values
- **Required fields** present in responses

### ❌ Failure Indicators:
- **Red X marks** for failed tests
- **High response times** (>5000ms)
- **Unexpected status codes** (4xx, 5xx)
- **Missing required fields**

## 🔍 Debugging Failed Tests

### Common Issues:

1. **Supabase Not Running**
   ```bash
   supabase start
   ```

2. **Invalid Environment Variables**
   - Check `base_url` points to correct Supabase instance
   - Verify `anon_key` is correct

3. **Database Not Seeded**
   ```bash
   supabase db reset
   ```

4. **Missing Test Data**
   - Some tests require existing data in database
   - Run database seed scripts first

### Debug Steps:

1. **Check Response Body**: Look at actual response vs expected
2. **Check Console Logs**: View detailed response data
3. **Verify Environment Variables**: Ensure all variables are set
4. **Check Supabase Status**: Verify local instance is running

## 📝 Sample Test Data

### Valid Application Creation:
```json
{
  "client": {
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.smith@example.com",
    "phone": "+61 2 9876 5432",
    "date_of_birth": "1995-05-15",
    "gender": "Female",
    "is_international_student": false
  },
  "address": {
    "residential": {
      "suburb": "Sydney",
      "state": "NSW",
      "postcode": "2000",
      "street_number": "123",
      "street_name": "George Street",
      "unit_details": "Unit 5",
      "building_name": "Sydney Tower"
    }
  },
  "enrolment_details": {
    "program_id": "{{program_id}}",
    "course_offering_id": "{{course_offering_id}}",
    "subject_structure": {
      "core_subject_ids": [],
      "elective_subject_ids": []
    },
    "start_date": "2025-02-01",
    "expected_completion_date": "2025-12-31",
    "delivery_location_id": "00000000-0000-0000-0000-000000000001",
    "delivery_mode_id": "ONLINE",
    "funding_source_id": "FEE_FOR_SERVICE",
    "study_reason_id": "CAREER_CHANGE",
    "is_vet_in_school": false,
    "is_apprenticeship": false,
    "is_traineeship": false
  },
  "agent_id": "{{agent_id}}",
  "is_international_student": false
}
```

## 🎯 Expected Results

### Successful Test Run Should Show:

- **All endpoints responding** with correct status codes
- **Data retrieval** working for all reference data
- **Application creation** successful with proper validation
- **Error handling** working for invalid requests
- **Response times** under 5 seconds for all requests

### Key Success Metrics:

- **100% test pass rate**
- **Average response time** < 2 seconds
- **Zero 5xx errors**
- **Proper error messages** for 4xx errors

## 🔧 Troubleshooting

### If Tests Fail:

1. **Check Supabase Status**:
   ```bash
   supabase status
   ```

2. **Reset Database**:
   ```bash
   supabase db reset
   ```

3. **Check Logs**:
   ```bash
   supabase logs
   ```

4. **Verify Environment**:
   - Ensure `base_url` is correct
   - Check `anon_key` is valid
   - Verify Supabase is running on port 54321

## 📚 Additional Resources

- **Supabase CLI**: https://supabase.com/docs/guides/cli
- **Postman Testing**: https://learning.postman.com/docs/writing-scripts/test-scripts/
- **API Documentation**: See `openapi.yaml` in project root

## 🎉 Success Criteria

Your API is battle-tested and ready when:

- ✅ **All tests pass** (100% success rate)
- ✅ **Response times** are acceptable (<5s)
- ✅ **Error handling** works correctly
- ✅ **Data validation** is working
- ✅ **Authentication** is properly implemented
- ✅ **All endpoints** are functional

---

**Ready to build the New Application Wizard!** 🚀
