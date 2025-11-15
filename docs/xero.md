# Complete Xero Accounting API Developer Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication & OAuth 2.0](#authentication--oauth-20)
3. [API Fundamentals](#api-fundamentals)
4. [Core Endpoints & Resources](#core-endpoints--resources)
5. [Data Models & Response Structures](#data-models--response-structures)
6. [Request & Response Handling](#request--response-handling)
7. [Filtering, Sorting & Pagination](#filtering-sorting--pagination)
8. [Rate Limiting & Throttling](#rate-limiting--throttling)
9. [Webhooks & Real-Time Sync](#webhooks--real-time-sync)
10. [Error Handling & Validation](#error-handling--validation)
11. [SDK Implementation](#sdk-implementation)
12. [Best Practices & Security](#best-practices--security)
13. [Code Examples](#code-examples)
14. [Troubleshooting & Common Issues](#troubleshooting--common-issues)

---

## Introduction

The Xero Accounting API is a RESTful web service that provides programmatic access to accounting and related functions of Xero, a cloud-based accounting software. The API enables developers to:

- Retrieve and manage accounting data (invoices, contacts, payments, credit notes)
- Automate financial workflows and processes
- Build custom integrations with CRM systems, e-commerce platforms, and reporting tools
- Sync financial data in near real-time using webhooks
- Create comprehensive financial dashboards and reporting applications

### Key Features

- **OAuth 2.0 Authentication**: Secure, industry-standard authentication mechanism
- **JSON Format**: All requests and responses use JSON for compatibility with modern development platforms
- **RESTful Architecture**: Standard HTTP methods (GET, POST, PUT, DELETE) for resource operations
- **Official SDKs**: Available for C#, Java, Node.js, PHP, Python, and Ruby
- **Real-Time Webhooks**: Event-driven synchronization for invoices and contacts
- **Comprehensive Data Access**: Over 40 different endpoints covering all accounting functions

---

## Authentication & OAuth 2.0

### OAuth 2.0 Overview

Xero uses OAuth 2.0 for authentication, which ensures that only authorized applications can access user data. OAuth 2.0 is the industry standard for API authorization and is mandatory for all Xero API access.

### OAuth 2.0 Grant Types

Xero supports three OAuth 2.0 grant types:

#### 1. Authorization Code Flow (Web Apps)

Used for web applications where users authorize your app to access their Xero account.

**Flow Steps:**
1. User initiates login/authorization in your application
2. Your app redirects user to Xero's authorization endpoint
3. User logs in to Xero and grants permissions
4. Xero redirects back to your app with an authorization code
5. Your app exchanges the code for access and refresh tokens
6. Your app uses the access token to make API requests

**Authorization Endpoint:**
```
https://login.xero.com/identity/connect/authorize
```

**Required Parameters:**
- `client_id`: Your app's unique identifier
- `response_type`: Set to `code`
- `scope`: Space-separated list of permissions (e.g., `openid profile email accounting.transactions offline_access`)
- `redirect_uri`: URL where Xero will redirect after authorization
- `state`: Random string to prevent CSRF attacks

**Example Authorization URL:**
```
https://login.xero.com/identity/connect/authorize?
client_id=YOUR_CLIENT_ID&
response_type=code&
scope=openid profile email accounting.transactions offline_access&
redirect_uri=https://yourapp.com/callback&
state=random_state_string
```

#### 2. PKCE Flow (Mobile & Desktop Apps)

Proof Key for Code Exchange (PKCE) is used for mobile and desktop applications where storing a client secret is not secure.

**Key Differences:**
- No client secret required
- Uses a dynamically generated code verifier and code challenge
- More secure for public clients

#### 3. Client Credentials Flow (M2M Integration - Premium Feature)

Used for server-to-server integrations without user interaction.

**Requirements:**
- Premium Xero integration feature
- Custom Connection setup in Xero developer portal
- Direct API access without user authorization flow

### Token Exchange

**Token Endpoint:**
```
POST https://identity.xero.com/connect/token
Content-Type: application/x-www-form-urlencoded
```

**Request Body (Authorization Code Flow):**
```
grant_type=authorization_code&
code=YOUR_AUTHORIZATION_CODE&
redirect_uri=YOUR_REDIRECT_URI&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 1800,
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile email accounting.transactions offline_access"
}
```

### Token Refresh

Access tokens expire after 30 minutes. Use the refresh token to obtain new access tokens without requiring user authorization again.

**Request:**
```
POST https://identity.xero.com/connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=YOUR_REFRESH_TOKEN&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET
```

**Important:** Refresh tokens expire after 60 days of inactivity. Implement a mechanism to periodically refresh access tokens to maintain continuous access.

### OAuth Scopes

Scopes define what permissions your app has. Always request only the permissions your app needs.

**Common Scopes:**
- `openid`: Required for OpenID Connect
- `profile`: User profile information
- `email`: User email address
- `accounting.transactions`: Access to invoices, payments, and related transactions
- `accounting.contacts`: Access to contacts (customers and suppliers)
- `accounting.settings`: Access to organization settings
- `accounting.attachments`: Upload and manage attachments
- `offline_access`: Obtain refresh tokens for offline access

**Scope Combinations for Full Accounting Access:**
```
openid profile email accounting.transactions accounting.contacts accounting.settings offline_access
```

---

## API Fundamentals

### Base URL

All API requests use the following base URL:

```
https://api.xero.com/api.xro/2.0
```

### API Versioning

The API version is included in the URL path (`2.0`). Monitor the Xero Changelog for deprecation notices and breaking changes.

### HTTP Methods

The API uses standard HTTP methods:
- **GET**: Retrieve resources
- **POST**: Create new resources or perform actions
- **PUT**: Update existing resources
- **DELETE**: Remove resources

### Request Headers

Every API request must include these headers:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
Xero-Tenant-ID: YOUR_XERO_TENANT_ID
Accept: application/json
Content-Type: application/json
```

**Header Descriptions:**
- `Authorization`: OAuth 2.0 Bearer token obtained from token exchange
- `Xero-Tenant-ID`: UUID of the Xero organization to access (required for multi-tenant scenarios)
- `Accept`: Specifies JSON response format
- `Content-Type`: Indicates request body format (for POST/PUT requests)

### Tenant Selection

When a user authorizes your app, they may have access to multiple Xero organizations (tenants). Use the Connections endpoint to retrieve available tenants:

**Endpoint:**
```
GET https://api.xero.com/connections
```

**Response:**
```json
{
  "id": "organization-uuid",
  "tenantName": "Acme Corporation",
  "tenantType": "ORGANISATION",
  "createdDateUtc": "2024-01-15T10:30:00Z"
}
```

Store the tenant ID and include it in the `Xero-Tenant-ID` header for all subsequent requests.

---

## Core Endpoints & Resources

### Invoices

**Base Endpoint:**
```
GET    /Invoices              # Retrieve all invoices
GET    /Invoices/{InvoiceID}  # Retrieve specific invoice
POST   /Invoices              # Create new invoice
PUT    /Invoices/{InvoiceID}  # Update invoice
DELETE /Invoices/{InvoiceID}  # Delete invoice
```

**Key Fields:**
- `InvoiceID`: Unique identifier (UUID)
- `InvoiceNumber`: User-friendly invoice number
- `ContactID`: Reference to contact (customer)
- `Type`: ACCREC (sales invoice) or ACCPAY (expense claim)
- `Status`: DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED
- `LineItems`: Array of line item details
- `Total`: Total invoice amount including tax
- `TotalTax`: Total tax amount
- `AmountDue`: Remaining amount to be paid
- `AmountPaid`: Amount already paid
- `DueDate`: Payment due date (ISO 8601 format)
- `Date`: Invoice date

### Contacts

**Base Endpoint:**
```
GET    /Contacts             # Retrieve all contacts
GET    /Contacts/{ContactID} # Retrieve specific contact
POST   /Contacts             # Create new contact
PUT    /Contacts/{ContactID} # Update contact
DELETE /Contacts/{ContactID} # Delete contact (archive)
```

**Key Fields:**
- `ContactID`: Unique identifier (UUID)
- `Name`: Contact name (required)
- `EmailAddress`: Primary email
- `ContactStatus`: ACTIVE or ARCHIVED
- `IsSupplier`: Boolean indicating if supplier
- `IsCustomer`: Boolean indicating if customer
- `DefaultCurrency`: Currency code (e.g., USD, AUD, GBP)
- `Addresses`: Array of address objects
- `Phones`: Array of phone objects
- `ContactGroups`: Array of group memberships
- `TaxNumber`: Tax identification number (VAT, GST, ABN)

### Payments

**Base Endpoint:**
```
GET    /Payments             # Retrieve all payments
GET    /Payments/{PaymentID} # Retrieve specific payment
POST   /Payments             # Create new payment
PUT    /Payments/{PaymentID} # Update payment
```

**Key Fields:**
- `PaymentID`: Unique identifier
- `InvoiceID`: Reference to invoice being paid
- `AccountID`: Bank/payment account
- `Amount`: Payment amount
- `PaymentDate`: Date of payment
- `Status`: AUTHORISED or DRAFT
- `Reference`: Payment reference/memo

### Credit Notes

**Base Endpoint:**
```
GET    /CreditNotes             # Retrieve all credit notes
GET    /CreditNotes/{CreditNoteID} # Retrieve specific credit note
POST   /CreditNotes             # Create new credit note
PUT    /CreditNotes/{CreditNoteID} # Update credit note
```

**Key Fields:**
- `CreditNoteID`: Unique identifier
- `ContactID`: Reference to contact
- `Status`: DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED
- `Type`: ACCRECCREDIT or ACCPAYCREDIT
- `LineItems`: Array of line items
- `Total`: Total amount

### Bank Transactions

**Base Endpoint:**
```
GET    /BankTransactions             # Retrieve all transactions
GET    /BankTransactions/{BankTransactionID} # Retrieve specific transaction
POST   /BankTransactions             # Create new transaction
PUT    /BankTransactions/{BankTransactionID} # Update transaction
```

### Accounts (Chart of Accounts)

**Base Endpoint:**
```
GET    /Accounts             # Retrieve all accounts
GET    /Accounts/{AccountID} # Retrieve specific account
POST   /Accounts             # Create new account
PUT    /Accounts/{AccountID} # Update account
```

**Key Fields:**
- `AccountID`: Unique identifier
- `Code`: Account code
- `Name`: Account name
- `Type`: BANK, EXPENSE, FIXED ASSET, etc.
- `Status`: ACTIVE or ARCHIVED

### Items

**Base Endpoint:**
```
GET    /Items             # Retrieve all items
GET    /Items/{ItemID}    # Retrieve specific item
POST   /Items             # Create new item
PUT    /Items/{ItemID}    # Update item
DELETE /Items/{ItemID}    # Delete item
```

**Key Fields:**
- `ItemID`: Unique identifier
- `Code`: Item/SKU code
- `Name`: Item name
- `Description`: Item description
- `UnitAmount`: Unit price for sales
- `TaxType`: Tax category (e.g., Tax on Sales, Tax on Purchases)
- `PurchaseDetails`: Purchase information
- `SalesDetails`: Sales information

### Tracking Categories

**Base Endpoint:**
```
GET    /TrackingCategories             # Retrieve all categories
GET    /TrackingCategories/{TrackingCategoryID} # Retrieve specific category
POST   /TrackingCategories             # Create new category
PUT    /TrackingCategories/{TrackingCategoryID} # Update category
```

### Users

**Base Endpoint:**
```
GET    /Users         # Retrieve all users
GET    /Users/{UserID} # Retrieve specific user
```

### Organizations

**Base Endpoint:**
```
GET    /Organisation   # Retrieve organization details
```

### Attachments

**Base Endpoint:**
```
GET    /{Endpoint}/{GUID}/Attachments/                    # List attachments
GET    /{Endpoint}/{GUID}/Attachments/{Filename}         # Download attachment
POST   /{Endpoint}/{GUID}/Attachments/{Filename}         # Upload attachment
DELETE /{Endpoint}/{GUID}/Attachments/{Filename}         # Delete attachment
```

**Supported Endpoints for Attachments:**
- Invoices
- Credit Notes
- Bank Transactions
- Contacts
- Payments
- Manual Journals
- Expense Claims

**Example:**
```
POST /Invoices/91369f96-5ec2-43ac-af17-983cc8faa3a5/Attachments/receipt.pdf
```

---

## Data Models & Response Structures

### Success Response Format

All successful responses follow this JSON structure:

```json
{
  "Invoices": [
    {
      "InvoiceID": "91369f96-5ec2-43ac-af17-983cc8faa3a5",
      "InvoiceNumber": "INV-001",
      "ContactID": "8a6f1c0a-90e5-48fa-b8f2-5b7d4e3c2a1f",
      "Type": "ACCREC",
      "Status": "AUTHORISED",
      "Date": "2024-01-15",
      "DueDate": "2024-02-15",
      "Total": 1200.00,
      "TotalTax": 120.00,
      "SubTotal": 1000.00,
      "AmountDue": 0,
      "AmountPaid": 1200.00,
      "LineItems": [
        {
          "LineItemID": "abc123",
          "Description": "Professional Services",
          "Quantity": 10,
          "UnitAmount": 100.00,
          "TaxAmount": 100.00,
          "TaxType": "Tax on Sales",
          "Total": 1100.00,
          "AccountCode": "200"
        }
      ],
      "UpdatedDateUtc": "2024-01-20T14:30:00Z"
    }
  ],
  "ApiResponse": {
    "Status": "OK"
  }
}
```

### Response Status Codes

| HTTP Code | Meaning | Description |
|-----------|---------|-------------|
| 200 | OK | Successful GET, PUT request |
| 201 | Created | Successful POST request creating new resource |
| 204 | No Content | Successful DELETE request |
| 400 | Bad Request | Invalid request format or missing required fields |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Xero API temporarily unavailable |

### Error Response Format

```json
{
  "ApiExceptions": [
    {
      "ErrorNumber": 400,
      "Type": "ValidationException",
      "Message": "The submitted data is not valid",
      "ValidationErrors": [
        {
          "Message": "Email address is invalid",
          "Field": "EmailAddress"
        },
        {
          "Message": "Contact name is required",
          "Field": "Name"
        }
      ]
    }
  ]
}
```

### Common Data Types

**Date/Time Format:**
- All dates are in ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`
- Example: `2024-01-15T14:30:00Z`
- UTC timezone is required

**Monetary Values:**
- Stored as decimal numbers with up to 2 decimal places
- Example: `1200.50`
- Always use positive values (negative for credits/refunds)

**Currency:**
- Three-letter ISO 4217 codes (USD, AUD, GBP, EUR, etc.)
- Typically defined at the organization level

**Identifiers:**
- All resource IDs are UUIDs (Universally Unique Identifiers)
- Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Example: `91369f96-5ec2-43ac-af17-983cc8faa3a5`

---

## Request & Response Handling

### GET Requests - Retrieving Data

**Retrieve All Invoices:**
```http
GET /Invoices HTTP/1.1
Host: api.xero.com
Authorization: Bearer YOUR_ACCESS_TOKEN
Xero-Tenant-ID: YOUR_TENANT_ID
Accept: application/json
```

**Retrieve Single Resource:**
```http
GET /Invoices/91369f96-5ec2-43ac-af17-983cc8faa3a5 HTTP/1.1
Host: api.xero.com
Authorization: Bearer YOUR_ACCESS_TOKEN
Xero-Tenant-ID: YOUR_TENANT_ID
Accept: application/json
```

### POST Requests - Creating Resources

**Create New Invoice:**
```http
POST /Invoices HTTP/1.1
Host: api.xero.com
Authorization: Bearer YOUR_ACCESS_TOKEN
Xero-Tenant-ID: YOUR_TENANT_ID
Content-Type: application/json

{
  "Invoices": [
    {
      "Type": "ACCREC",
      "ContactID": "8a6f1c0a-90e5-48fa-b8f2-5b7d4e3c2a1f",
      "InvoiceNumber": "INV-002",
      "Date": "2024-01-20",
      "DueDate": "2024-02-20",
      "LineItems": [
        {
          "Description": "Consulting Services",
          "Quantity": 5,
          "UnitAmount": 200.00,
          "AccountCode": "200",
          "TaxType": "Tax on Sales"
        }
      ]
    }
  ]
}
```

### PUT Requests - Updating Resources

**Update Existing Invoice:**
```http
PUT /Invoices HTTP/1.1
Host: api.xero.com
Authorization: Bearer YOUR_ACCESS_TOKEN
Xero-Tenant-ID: YOUR_TENANT_ID
Content-Type: application/json

{
  "Invoices": [
    {
      "InvoiceID": "91369f96-5ec2-43ac-af17-983cc8faa3a5",
      "Type": "ACCREC",
      "DueDate": "2024-03-20"
    }
  ]
}
```

**Important:** Include the resource ID in the request body for PUT requests.

### DELETE Requests

**Archive/Delete Resource:**
```http
DELETE /Invoices/91369f96-5ec2-43ac-af17-983cc8faa3a5 HTTP/1.1
Host: api.xero.com
Authorization: Bearer YOUR_ACCESS_TOKEN
Xero-Tenant-ID: YOUR_TENANT_ID
```

### Batch Operations

Create or update multiple resources in a single request:

```http
POST /Invoices HTTP/1.1
Host: api.xero.com
Authorization: Bearer YOUR_ACCESS_TOKEN
Xero-Tenant-ID: YOUR_TENANT_ID
Content-Type: application/json

{
  "Invoices": [
    {
      "Type": "ACCREC",
      "ContactID": "contact-id-1",
      "InvoiceNumber": "INV-001",
      "Date": "2024-01-20",
      "LineItems": [...]
    },
    {
      "Type": "ACCREC",
      "ContactID": "contact-id-2",
      "InvoiceNumber": "INV-002",
      "Date": "2024-01-20",
      "LineItems": [...]
    }
  ]
}
```

**Response with Batch:**
```json
{
  "Invoices": [
    {
      "InvoiceID": "id-1",
      "InvoiceNumber": "INV-001",
      "Status": "SUBMITTED"
    },
    {
      "InvoiceID": "id-2",
      "InvoiceNumber": "INV-002",
      "Status": "SUBMITTED"
    }
  ]
}
```

**Handling Partial Failures:**

By default, the API returns a summarized error view when one or more resources fail validation. To see which resources succeeded and which failed, use the query parameter `?SummarizeErrors=false`:

```http
POST /Invoices?SummarizeErrors=false HTTP/1.1
```

---

## Filtering, Sorting & Pagination

### WHERE Clause - Advanced Filtering

The `where` parameter allows complex filtering on most endpoints:

**Basic Syntax:**
```
GET /Invoices?where=Status=="SUBMITTED"
GET /Invoices?where=Type=="ACCREC"
GET /Invoices?where=Total>500
GET /Invoices?where=Date>2024-01-01
```

**Operators:**
- `==`: Equals
- `!=`: Not equals
- `>`: Greater than
- `<`: Less than
- `>=`: Greater than or equal
- `<=`: Less than or equal
- `&&`: AND operator
- `||`: OR operator

**Complex Queries:**
```
GET /Invoices?where=Status=="AUTHORISED"&&Type=="ACCREC"&&Total>1000
GET /Contacts?where=IsSupplier==true||IsCustomer==true
GET /Invoices?where=Date>2024-01-01&&Date<2024-12-31
```

**Text Matching:**
```
GET /Contacts?where=Name.Contains("Acme")
GET /Contacts?where=EmailAddress.StartsWith("admin@")
```

**GUID Filtering:**
```
GET /Invoices?where=ContactID==GUID(8a6f1c0a-90e5-48fa-b8f2-5b7d4e3c2a1f)
```

### Optimized Query Parameters

For better performance on large datasets, use specific query parameters instead of WHERE clauses:

**Filter by IDs:**
```
GET /Invoices?IDs=91369f96-5ec2-43ac-af17-983cc8faa3a5,73ae9e67-f17c-4eac-9008-7e94f99b52e9
```

**Filter by Contact IDs:**
```
GET /Invoices?ContactIDs=contact-id-1,contact-id-2
```

**Filter by Invoice Numbers:**
```
GET /Invoices?InvoiceNumbers=INV-001,INV-002,INV-003
```

**Filter by Status:**
```
GET /Invoices?Statuses=DRAFT,SUBMITTED,AUTHORISED
```

**Combine Filters:**
```
GET /Invoices?Statuses=SUBMITTED&where=Type=="ACCREC"&order=Date&page=1
```

### Sorting & Ordering

**Order Results:**
```
GET /Invoices?order=Date
GET /Invoices?order=Date%20DESC
GET /Contacts?order=Name
GET /Payments?order=PaymentDate%20DESC
```

**Supported Sort Fields:** Varies by endpoint, but commonly includes Date, Total, Status, Name, etc.

### Pagination

**Page-Based Pagination:**
```
GET /Invoices?page=1
GET /Invoices?page=2&pageSize=50
```

**Parameters:**
- `page`: Page number (starts at 1)
- `pageSize`: Number of results per page (default: 100, max: 1000)

**Updated Pagination Feature (2025):**
Xero increased maximum page size from 100 to 1000 results per page for these endpoints:
- Invoices
- Contacts
- Bank Transactions
- Credit Notes
- Payments
- Manual Journals
- Quotes
- Purchase Orders

**Example - Fetch 1000 Results:**
```
GET /Invoices?page=1&pageSize=1000
```

**Pagination Response Metadata:**
```json
{
  "Invoices": [...],
  "ApiResponse": {
    "Status": "OK"
  }
}
```

**Handling Large Datasets:**

1. Request with `pageSize=1000` to minimize API calls
2. Check if returned results equal page size (indicates more pages)
3. Loop through pages until fewer results than page size are returned

### Modified Since Filtering

Retrieve only records created or modified after a specific timestamp:

```
GET /Invoices?ModifiedAfter=2024-01-15T10:30:00Z
```

**Important:** The `ModifiedAfter` parameter helps reduce API calls when syncing data incrementally. However, modifications to attachments do not trigger `UpdatedDateUtc` updates.

---

## Rate Limiting & Throttling

### Rate Limit Quotas

The Xero API enforces rate limits to ensure fair usage and system stability:

**Per-Minute Limit:**
- 60 API calls per minute per connected organization
- Applies to burst/concurrent traffic
- Enforced at 5 concurrent calls

**Daily Limit:**
- 5,000 API calls per 24-hour period per connected organization
- Resets every calendar day

**Monitor Rate Limit Status:**

Every API response includes rate limit information in headers:

```http
x-rate-limit-limit: 5000
x-rate-limit-remaining: 4850
x-rate-limit-problem: minute
retry-after: 60
```

**Header Descriptions:**
- `x-rate-limit-limit`: Total daily limit
- `x-rate-limit-remaining`: Remaining calls for the day
- `x-rate-limit-problem`: Type of limit hit (minute or day)
- `retry-after`: Seconds to wait before retrying

### Handling Rate Limit Errors

**HTTP 429 - Too Many Requests**

```json
{
  "ApiExceptions": [
    {
      "ErrorNumber": 429,
      "Type": "RateLimitException",
      "Message": "Rate limit exceeded"
    }
  ]
}
```

### Exponential Backoff Strategy

Implement exponential backoff to handle rate limit errors gracefully:

```javascript
async function makeApiCallWithRetry(url, options, maxRetries = 5) {
  let retryCount = 0;
  let delay = 1000; // Start with 1 second

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(url, options);

      // Check if rate limited
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
        
        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        retryCount++;
        delay = Math.min(delay * 2, 60000); // Cap at 60 seconds
        continue;
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (retryCount < maxRetries - 1) {
        console.log(`Error occurred. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
        delay = Math.min(delay * 2, 60000);
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retries exceeded');
}
```

### Optimization Strategies

1. **Batch Requests:** Post/PUT multiple resources in a single request
2. **Use pageSize=1000:** Reduce number of pagination calls
3. **Filter Efficiently:** Use optimized query parameters (IDs, ContactIDs) instead of WHERE clauses
4. **Webhook Integration:** Use webhooks instead of polling for real-time updates
5. **Cache Data:** Store frequently accessed data locally with appropriate TTL
6. **Request Only Needed Data:** Use summaryOnly parameter where applicable
7. **Implement Queue System:** Queue API requests and process them at controlled rate

---

## Webhooks & Real-Time Sync

### Webhook Overview

Webhooks allow your application to receive real-time notifications when invoices or contacts are created or updated in Xero, eliminating the need for constant polling.

### Webhook Events

Currently supported events:
- `INVOICE.CREATED`: Invoice created
- `INVOICE.UPDATED`: Invoice updated
- `INVOICE.DELETED`: Invoice deleted (if applicable)
- `CONTACT.CREATED`: Contact created
- `CONTACT.UPDATED`: Contact updated
- `CONTACT.DELETED`: Contact deleted (if applicable)

### Setting Up Webhooks

**Step 1: Register Webhook in Developer Portal**

1. Log in to Xero Developer Center
2. Navigate to your app
3. Go to Webhooks section
4. Add your webhook URL (must be HTTPS, publicly accessible)
5. Save and receive webhook key

**Step 2: Create Webhook Endpoint**

Your endpoint must:
- Accept POST requests
- Respond with HTTP 200 OK within 5 seconds
- Validate incoming webhooks using HMAC-SHA256
- Process webhook asynchronously if heavy operations required

**Example Webhook Endpoint (Node.js/Express):**

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

const WEBHOOK_KEY = 'YOUR_WEBHOOK_KEY';

// Middleware to parse JSON
app.use(express.json());

// Webhook endpoint
app.post('/xero-webhook', (req, res) => {
  try {
    // Validate webhook signature
    const signature = req.headers['x-xero-signature'];
    const payload = JSON.stringify(req.body);
    
    const hash = crypto
      .createHmac('sha256', WEBHOOK_KEY)
      .update(payload)
      .digest('base64');

    if (hash !== signature) {
      console.error('Invalid webhook signature');
      return res.status(401).send('Unauthorized');
    }

    // Respond immediately (must be within 5 seconds)
    res.status(200).send('OK');

    // Process webhook asynchronously
    processWebhookEvent(req.body).catch(err => {
      console.error('Error processing webhook:', err);
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send('Bad Request');
  }
});

async function processWebhookEvent(webhookData) {
  const { events = [] } = webhookData;

  for (const event of events) {
    const { resourceId, resourceType, eventType, eventCategory } = event;
    
    console.log(`Processing ${eventType} event for ${resourceType}: ${resourceId}`);

    if (eventCategory === 'INVOICE') {
      await handleInvoiceEvent(resourceId, eventType);
    } else if (eventCategory === 'CONTACT') {
      await handleContactEvent(resourceId, eventType);
    }
  }
}

async function handleInvoiceEvent(invoiceId, eventType) {
  // Fetch the invoice using API
  const invoice = await fetchInvoiceFromXero(invoiceId);
  
  if (eventType === 'CREATE') {
    // Handle new invoice
    await saveInvoiceToDatabase(invoice);
  } else if (eventType === 'UPDATE') {
    // Handle invoice update
    await updateInvoiceInDatabase(invoice);
  }
}

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
```

### Webhook Payload Format

```json
{
  "events": [
    {
      "resourceId": "91369f96-5ec2-43ac-af17-983cc8faa3a5",
      "resourceType": "Invoice",
      "eventType": "CREATE",
      "eventCategory": "INVOICE",
      "eventDateUtc": "2024-01-20T14:30:00Z",
      "eventSequence": 1,
      "tenantId": "8a6f1c0a-90e5-48fa-b8f2-5b7d4e3c2a1f",
      "tenantType": "ORGANISATION"
    }
  ],
  "firstEventSequence": 1,
  "lastEventSequence": 1,
  "entropy": "random-string-value"
}
```

### Processing Webhook Events

**Workflow:**
1. Receive webhook event with resource ID
2. Make API GET request to fetch full resource details
3. Compare with cached version to identify changes
4. Update local database
5. Trigger any downstream actions (notifications, calculations, etc.)

---

## Error Handling & Validation

### Common Error Codes

| Error | HTTP Code | Meaning | Resolution |
|-------|-----------|---------|-----------|
| ValidationException | 400 | Invalid request data | Validate all required fields and data types |
| BadRequest | 400 | Malformed request | Check request format and syntax |
| Unauthorised | 401 | Invalid/expired token | Refresh access token |
| RateLimitException | 429 | Too many requests | Implement exponential backoff |
| NotFound | 404 | Resource not found | Verify resource ID and existence |
| InternalServerError | 500 | Server error | Retry with exponential backoff |

### Request Validation

**Required Fields by Resource:**

**Invoice (Create):**
- Type (ACCREC or ACCPAY)
- ContactID
- LineItems (at least one)
- Date

**Contact (Create):**
- Name (required, max 255 characters)
- EmailAddress (optional, must be valid email format)

**Payment (Create):**
- InvoiceID
- Amount
- AccountID
- PaymentDate

**Line Item (Create):**
- Description
- Quantity
- UnitAmount
- TaxType or AccountCode

### Validation Example

```javascript
function validateInvoice(invoice) {
  const errors = [];

  // Type validation
  if (!invoice.Type || !['ACCREC', 'ACCPAY'].includes(invoice.Type)) {
    errors.push({ field: 'Type', message: 'Type must be ACCREC or ACCPAY' });
  }

  // ContactID validation
  if (!invoice.ContactID || !isValidUUID(invoice.ContactID)) {
    errors.push({ field: 'ContactID', message: 'Valid ContactID is required' });
  }

  // LineItems validation
  if (!invoice.LineItems || invoice.LineItems.length === 0) {
    errors.push({ field: 'LineItems', message: 'At least one line item is required' });
  }

  // Date validation
  if (!invoice.Date || !isValidDate(invoice.Date)) {
    errors.push({ field: 'Date', message: 'Valid date is required' });
  }

  // Monetary validation
  if (invoice.Total < 0) {
    errors.push({ field: 'Total', message: 'Total cannot be negative' });
  }

  return errors.length > 0 ? errors : null;
}

function isValidUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

function isValidDate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}
```

### Error Handling Best Practices

```javascript
async function createInvoice(invoiceData) {
  try {
    // Validate input
    const validationErrors = validateInvoice(invoiceData);
    if (validationErrors) {
      throw new ValidationError('Invoice validation failed', validationErrors);
    }

    // Make API request
    const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ Invoices: [invoiceData] })
    });

    // Handle different HTTP status codes
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new RateLimitError(`Rate limited. Retry after ${retryAfter}s`);
    }

    if (response.status === 401) {
      throw new AuthenticationError('Access token expired');
    }

    if (!response.ok) {
      const errorBody = await response.json();
      throw new ApiError(
        `API error: ${response.status}`,
        errorBody.ApiExceptions?.[0]?.Message
      );
    }

    return await response.json();

  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.details);
      // Handle validation error (user feedback)
    } else if (error instanceof RateLimitError) {
      console.error('Rate limit hit:', error.message);
      // Implement retry strategy
    } else if (error instanceof AuthenticationError) {
      console.error('Authentication failed:', error.message);
      // Refresh token and retry
    } else if (error instanceof ApiError) {
      console.error('API error:', error.message, error.details);
      // Log and handle API error
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
  }
}

class RateLimitError extends Error {}
class AuthenticationError extends Error {}
class ApiError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
  }
}
```

---

## SDK Implementation

### Official SDKs

Xero provides official SDKs for major programming languages:

| Language | Package | Repository |
|----------|---------|-----------|
| Node.js | `xero-node` | github.com/XeroAPI/xero-node |
| Python | `xero-python` | github.com/XeroAPI/xero-python |
| Java | `xero-java` | github.com/XeroAPI/xero-java |
| C# (.NET) | `Xero.NetStandard.OAuth2` | github.com/XeroAPI/Xero-NetStandard |
| PHP | `xero-php-oauth2` | github.com/XeroAPI/xero-php-oauth2 |
| Ruby | `xero-ruby` | github.com/XeroAPI/xero-ruby |

### Node.js SDK Implementation

**Installation:**
```bash
npm install xero-node
```

**Basic Setup:**
```javascript
const { XeroClient } = require('xero-node');

const xero = new XeroClient({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUris: ['http://localhost:5000/callback'],
  scopes: [
    'openid',
    'profile',
    'email',
    'accounting.transactions',
    'accounting.contacts',
    'accounting.settings',
    'offline_access'
  ]
});

// Generate authorization URL
const authUrl = await xero.buildConsentUrl();
console.log('Authorize here:', authUrl);
```

**OAuth Flow:**
```javascript
// In your callback handler
app.get('/callback', async (req, res) => {
  try {
    // Exchange authorization code for tokens
    const tokenSet = await xero.apiCallback(req.url);
    await xero.setTokenSet(tokenSet);

    // Get organization information
    const orgs = await xero.accountingApi.getOrganizations();
    console.log('Connected to:', orgs.body.organizations[0].name);

    res.redirect('/dashboard');
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('Authentication failed');
  }
});
```

**Making API Calls:**
```javascript
async function getInvoices(tenantId) {
  try {
    const response = await xero.accountingApi.getInvoices(
      tenantId,
      undefined, // where
      undefined, // order
      1,         // page
      100        // pageSize
    );
    
    console.log('Invoices:', response.body.invoices);
    return response.body.invoices;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}

async function createInvoice(tenantId, invoiceData) {
  try {
    const response = await xero.accountingApi.createInvoices(
      tenantId,
      { invoices: [invoiceData] },
      { summarizeErrors: true }
    );
    
    console.log('Created invoice:', response.body.invoices[0]);
    return response.body.invoices[0];
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}
```

### Python SDK Implementation

**Installation:**
```bash
pip install xero-python
```

**Basic Setup:**
```python
from xero_python.api_client import ApiClient, Configuration
from xero_python.accounting_api import AccountingApi
from xero_python.identity_api import IdentityApi

configuration = Configuration(
    oauth2_token="YOUR_ACCESS_TOKEN"
)

api_client = ApiClient(configuration, header_name="Authorization", header_value="Bearer YOUR_ACCESS_TOKEN")

# Get API instances
accounting_api = AccountingApi(api_client)
identity_api = IdentityApi(api_client)
```

**Making API Calls:**
```python
def get_invoices(tenant_id, page=1, page_size=100):
    try:
        response = accounting_api.get_invoices(
            xero_tenant_id=tenant_id,
            page=page,
            page_size=page_size
        )
        return response.invoices
    except Exception as error:
        print(f"Error fetching invoices: {error}")
        raise

def create_invoice(tenant_id, invoice_data):
    try:
        response = accounting_api.create_invoices(
            xero_tenant_id=tenant_id,
            invoices=invoice_data
        )
        return response.invoices[0]
    except Exception as error:
        print(f"Error creating invoice: {error}")
        raise
```

---

## Best Practices & Security

### Token Management

**Secure Storage:**

1. **Never store tokens in client-side code** (JavaScript in browser)
2. **Encrypt tokens** before storing in database
3. **Use environment variables** for client credentials (never commit to version control)
4. **Implement separate storage** for access and refresh tokens

**Token Encryption Example (Node.js):**

```javascript
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes

function encryptToken(token) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

function decryptToken(encryptedToken) {
  const parts = encryptedToken.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Database Schema for Token Storage

```sql
CREATE TABLE xero_connections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  tenant_name VARCHAR(255),
  access_token TEXT NOT NULL,  -- Encrypted
  refresh_token TEXT NOT NULL, -- Encrypted
  token_expires_at TIMESTAMP,
  scopes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_tenant ON xero_connections(user_id, tenant_id);
```

### Data Security

1. **HTTPS/TLS:** All API communications must use HTTPS with TLS 1.2+ and AES-256
2. **Request Validation:** Validate all webhook signatures using HMAC-SHA256
3. **Sensitive Data:** Don't log authentication tokens or sensitive financial data
4. **Rate Limiting:** Implement server-side rate limiting to prevent abuse
5. **Input Sanitization:** Sanitize all user inputs before using in API requests

### Production Deployment Checklist

- [ ] All tokens encrypted at rest
- [ ] Secrets stored in secure environment variables
- [ ] HTTPS/TLS enforced for all communications
- [ ] Webhook signatures validated
- [ ] Error handling implemented for all API calls
- [ ] Rate limit handling with exponential backoff
- [ ] Comprehensive logging and monitoring
- [ ] Database backups configured
- [ ] Monitoring alerts set up
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Documentation updated

### API Call Optimization

1. **Batch Operations:** Combine multiple creates/updates into single request
2. **Efficient Filtering:** Use optimized query parameters instead of WHERE
3. **Pagination:** Use pageSize=1000 for large datasets
4. **Caching:** Cache frequently accessed data with TTL
5. **Webhooks:** Use for real-time updates instead of polling
6. **Connections Limit:** Handle multiple Xero organizations efficiently

### Monitoring & Logging

```javascript
// Structured logging for API calls
function logApiCall(method, endpoint, statusCode, responseTime, error = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method,
    endpoint,
    statusCode,
    responseTime: `${responseTime}ms`,
    error: error ? error.message : null
  };
  
  console.log(JSON.stringify(logEntry));
  
  // Send to logging service (Datadog, CloudWatch, etc.)
  if (statusCode >= 400) {
    alertMonitoring(logEntry);
  }
}

// Monitor rate limits
function monitorRateLimit(response) {
  const remaining = parseInt(response.headers.get('x-rate-limit-remaining'));
  const limit = parseInt(response.headers.get('x-rate-limit-limit'));
  const percentUsed = (((limit - remaining) / limit) * 100).toFixed(2);
  
  console.log(`API Rate Limit: ${percentUsed}% used (${limit - remaining}/${limit})`);
  
  if (remaining < limit * 0.1) { // Alert at 90% usage
    alertRateLimitWarning(remaining, limit);
  }
}
```

---

## Code Examples

### Complete Invoice Workflow (Node.js)

```javascript
const { XeroClient } = require('xero-node');
const express = require('express');

const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: [process.env.XERO_REDIRECT_URI],
  scopes: [
    'openid',
    'profile',
    'email',
    'accounting.transactions',
    'accounting.contacts',
    'offline_access'
  ]
});

const app = express();
app.use(express.json());

// OAuth callback
app.get('/auth/xero/callback', async (req, res) => {
  try {
    const tokenSet = await xero.apiCallback(req.url);
    await xero.setTokenSet(tokenSet);
    
    // Store tokens securely
    await storeTokens(req.user.id, tokenSet);
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Get all invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const tenantId = req.query.tenantId;
    const page = parseInt(req.query.page || '1');
    
    const response = await xero.accountingApi.getInvoices(
      tenantId,
      undefined,
      'InvoiceNumber',
      page,
      1000
    );
    
    res.json({
      invoices: response.body.invoices,
      page,
      total: response.body.invoices.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoice by ID
app.get('/api/invoices/:invoiceId', async (req, res) => {
  try {
    const tenantId = req.query.tenantId;
    
    const response = await xero.accountingApi.getInvoice(
      tenantId,
      req.params.invoiceId
    );
    
    res.json(response.body.invoices[0]);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Create invoice
app.post('/api/invoices', async (req, res) => {
  try {
    const tenantId = req.query.tenantId;
    const invoiceData = req.body;
    
    // Validate invoice
    const validationErrors = validateInvoice(invoiceData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }
    
    const response = await xero.accountingApi.createInvoices(
      tenantId,
      { invoices: [invoiceData] }
    );
    
    res.status(201).json(response.body.invoices[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update invoice
app.put('/api/invoices/:invoiceId', async (req, res) => {
  try {
    const tenantId = req.query.tenantId;
    const invoiceData = { ...req.body, InvoiceID: req.params.invoiceId };
    
    const response = await xero.accountingApi.updateInvoice(
      tenantId,
      req.params.invoiceId,
      { invoices: [invoiceData] }
    );
    
    res.json(response.body.invoices[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Helper: Validate invoice
function validateInvoice(invoice) {
  const errors = [];
  
  if (!invoice.Type || !['ACCREC', 'ACCPAY'].includes(invoice.Type)) {
    errors.push('Type is required and must be ACCREC or ACCPAY');
  }
  
  if (!invoice.ContactID) {
    errors.push('ContactID is required');
  }
  
  if (!invoice.LineItems || invoice.LineItems.length === 0) {
    errors.push('At least one line item is required');
  }
  
  if (!invoice.Date) {
    errors.push('Date is required');
  }
  
  return errors;
}

// Helper: Store tokens securely
async function storeTokens(userId, tokenSet) {
  // Encrypt tokens and store in database
  const encryptedAccessToken = encryptToken(tokenSet.access_token);
  const encryptedRefreshToken = encryptToken(tokenSet.refresh_token);
  
  // Update database
  await db.query(
    'UPDATE users SET xero_access_token = ?, xero_refresh_token = ?, xero_token_expires = ? WHERE id = ?',
    [encryptedAccessToken, encryptedRefreshToken, new Date(tokenSet.expires_in * 1000), userId]
  );
}

app.listen(3000, () => console.log('Server running on port 3000'));
```

### Complete Contact Management (Python)

```python
import json
import requests
from datetime import datetime, timedelta
from functools import wraps
import time

class XeroIntegration:
    def __init__(self, access_token, tenant_id):
        self.access_token = access_token
        self.tenant_id = tenant_id
        self.base_url = "https://api.xero.com/api.xro/2.0"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Xero-Tenant-ID": tenant_id,
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    
    def rate_limit_handler(func):
        """Decorator to handle rate limiting with exponential backoff"""
        @wraps(func)
        def wrapper(*args, **kwargs):
            max_retries = 5
            retry_count = 0
            delay = 1
            
            while retry_count < max_retries:
                try:
                    return func(*args, **kwargs)
                except requests.exceptions.HTTPError as e:
                    if e.response.status_code == 429:
                        retry_after = int(e.response.headers.get('retry-after', delay))
                        print(f"Rate limited. Waiting {retry_after}s...")
                        time.sleep(retry_after)
                        retry_count += 1
                        delay = min(delay * 2, 60)
                    else:
                        raise
            
            raise Exception("Max retries exceeded")
        
        return wrapper
    
    @rate_limit_handler
    def get_contacts(self, page=1, page_size=100):
        """Retrieve all contacts"""
        response = requests.get(
            f"{self.base_url}/Contacts",
            headers=self.headers,
            params={"page": page, "pageSize": page_size}
        )
        response.raise_for_status()
        return response.json().get("Contacts", [])
    
    @rate_limit_handler
    def get_contact(self, contact_id):
        """Retrieve specific contact"""
        response = requests.get(
            f"{self.base_url}/Contacts/{contact_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json().get("Contacts", [{}])[0]
    
    @rate_limit_handler
    def create_contact(self, contact_data):
        """Create new contact"""
        payload = {"Contacts": [contact_data]}
        response = requests.post(
            f"{self.base_url}/Contacts",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json().get("Contacts", [{}])[0]
    
    @rate_limit_handler
    def update_contact(self, contact_id, contact_data):
        """Update existing contact"""
        contact_data["ContactID"] = contact_id
        payload = {"Contacts": [contact_data]}
        response = requests.put(
            f"{self.base_url}/Contacts",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json().get("Contacts", [{}])[0]
    
    @rate_limit_handler
    def archive_contact(self, contact_id):
        """Archive/delete contact"""
        contact = {"ContactID": contact_id, "ContactStatus": "ARCHIVED"}
        payload = {"Contacts": [contact]}
        response = requests.put(
            f"{self.base_url}/Contacts",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json().get("Contacts", [{}])[0]
    
    def search_contacts(self, name):
        """Search contacts by name"""
        all_contacts = []
        page = 1
        
        while True:
            contacts = self.get_contacts(page=page, page_size=100)
            if not contacts:
                break
            
            all_contacts.extend(contacts)
            if len(contacts) < 100:
                break
            
            page += 1
        
        # Filter by name
        return [c for c in all_contacts if name.lower() in c.get("Name", "").lower()]

# Usage Example
if __name__ == "__main__":
    xero = XeroIntegration(
        access_token="YOUR_ACCESS_TOKEN",
        tenant_id="YOUR_TENANT_ID"
    )
    
    # Create contact
    new_contact = {
        "Name": "Acme Corporation",
        "EmailAddress": "contact@acme.com",
        "IsCustomer": True,
        "IsSupplier": False,
        "DefaultCurrency": "AUD"
    }
    
    created = xero.create_contact(new_contact)
    print(f"Created contact: {created['ContactID']}")
    
    # Search contacts
    results = xero.search_contacts("Acme")
    for contact in results:
        print(f"- {contact['Name']} ({contact['EmailAddress']})")
```

---

## Troubleshooting & Common Issues

### Issue: "Invalid Bearer Token"

**Cause:** Access token expired or invalid

**Solution:**
1. Check token expiration time
2. Refresh access token using refresh token
3. Re-authenticate if refresh token also expired

```javascript
async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.XERO_CLIENT_ID,
      client_secret: process.env.XERO_CLIENT_SECRET
    })
  });
  
  if (!response.ok) {
    throw new Error('Token refresh failed');
  }
  
  return await response.json();
}
```

### Issue: "Rate Limit Exceeded" (429 Error)

**Cause:** Exceeded API rate limits (60 calls/min or 5000 calls/day)

**Solution:**
1. Implement exponential backoff retry logic
2. Use batch operations to reduce API calls
3. Use webhooks instead of polling
4. Increase pageSize to 1000 for large datasets
5. Cache frequently accessed data

### Issue: "Validation Exception" on Invoice Creation

**Cause:** Missing or invalid required fields

**Common Missing Fields:**
- Type (ACCREC or ACCPAY)
- ContactID
- LineItems (at least one)
- AccountCode on line items

**Solution:** Validate all required fields before API call

```javascript
const requiredFields = {
  'Type': ['ACCREC', 'ACCPAY'],
  'ContactID': 'uuid',
  'LineItems': 'array_min_1',
  'Date': 'iso_8601'
};

function validateRequired(invoice) {
  for (const [field, validation] of Object.entries(requiredFields)) {
    if (!invoice[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}
```

### Issue: "Unauthorized" (401) on Contacts Endpoint

**Cause:** Missing `accounting.contacts` scope

**Solution:** Request proper scopes during OAuth authorization

```javascript
const scopes = [
  'openid',
  'profile',
  'email',
  'accounting.contacts',  // Required for contacts access
  'accounting.transactions',
  'offline_access'
];
```

### Issue: Webhook Not Receiving Events

**Causes:**
1. Webhook URL not HTTPS
2. Endpoint not responding within 5 seconds
3. Invalid webhook key
4. Webhook not registered correctly

**Solution:**
1. Ensure endpoint is publicly accessible HTTPS
2. Respond immediately with 200 OK before processing
3. Validate webhook signature
4. Check webhook registration in developer portal

### Issue: Attachment Upload Fails

**Cause:** Invalid file format or size

**Solution:**
```javascript
async function uploadAttachment(invoiceId, filename, fileData) {
  // Check file size (typically < 4MB)
  if (fileData.length > 4 * 1024 * 1024) {
    throw new Error('File too large (max 4MB)');
  }
  
  const response = await fetch(
    `https://api.xero.com/api.xro/2.0/Invoices/${invoiceId}/Attachments/${filename}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-ID': tenantId
      },
      body: fileData
    }
  );
  
  return response.json();
}
```

### Issue: "Chart of Accounts Not Found" on Invoice Creation

**Cause:** Invalid AccountCode reference

**Solution:** Verify account codes exist for organization

```javascript
async function getChartOfAccounts(tenantId) {
  const response = await fetch(
    'https://api.xero.com/api.xro/2.0/Accounts',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-ID': tenantId
      }
    }
  );
  
  const data = await response.json();
  return data.Accounts.map(a => ({ code: a.Code, name: a.Name }));
}
```

---

## Additional Resources

### Official Documentation
- Xero Developer Center: developer.xero.com
- API Changelog: Track breaking changes and new features
- SDK Repositories: GitHub Xero API repositories

### Best Practice Guides
- Integration Best Practices
- CRM Integration Guide
- Payroll Integration Guide
- Financial Reporting Integration

### Community Resources
- Stack Overflow (tag: xero-api)
- Xero Community Forums
- Developer Blog: devblog.xero.com

### Testing & Development
- Xero Demo Company: Free sandbox environment
- Postman Collection: Pre-built API requests
- OpenAPI Spec: Full API specification

---

## Conclusion

The Xero Accounting API provides a comprehensive platform for building accounting integrations. Key takeaways:

1. **Authentication:** Master OAuth 2.0 flow and token management
2. **Efficiency:** Use optimized query parameters and batch operations
3. **Real-Time:** Leverage webhooks for real-time data synchronization
4. **Security:** Encrypt tokens, validate inputs, use HTTPS
5. **Rate Limits:** Implement proper retry logic and exponential backoff
6. **Error Handling:** Validate data before API calls and handle errors gracefully
7. **Monitoring:** Log API calls and set up alerts for issues
8. **Testing:** Use demo company for development and testing

By following these guidelines and best practices, you can build robust, scalable, and secure integrations with the Xero platform.
