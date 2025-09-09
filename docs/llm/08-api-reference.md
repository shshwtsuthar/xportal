# API Reference & Integration Guide

## Overview

This document provides comprehensive API reference documentation for the XPortal SMS system, including detailed endpoint specifications, request/response examples, authentication, error handling, and integration guides for developers.

## Table of Contents

1. [Authentication](#authentication)
2. [Base URL and Endpoints](#base-url-and-endpoints)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Integration Examples](#integration-examples)
8. [SDK and Libraries](#sdk-and-libraries)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

## Authentication

### JWT Token Authentication

All API endpoints require authentication using JWT tokens. The token must be included in the Authorization header.

```http
Authorization: Bearer <your-jwt-token>
```

### Getting Authentication Token

```typescript
// Frontend authentication
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Sign in user
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Get session token
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
```

### Token Refresh

```typescript
// Refresh token automatically
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    // Update API client with new token
    updateApiClient(session.access_token)
  }
})
```

## Base URL and Endpoints

### Development Environment
```
Base URL: http://localhost:54321/functions/v1
```

### Staging Environment
```
Base URL: https://your-staging-project.supabase.co/functions/v1
```

### Production Environment
```
Base URL: https://your-production-project.supabase.co/functions/v1
```

### Endpoint Structure
```
{base_url}/{function_name}
```

## API Endpoints

### Applications API

#### Get All Applications
```http
GET /applications
```

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `status` (optional): Filter by application status
- `search` (optional): Search term for filtering

**Response:**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "uuid",
        "clientId": "uuid",
        "programId": "uuid",
        "status": "draft",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

#### Get Application by ID
```http
GET /applications/{id}
```

**Path Parameters:**
- `id`: Application UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clientId": "uuid",
    "programId": "uuid",
    "status": "draft",
    "personalDetails": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+61412345678"
    },
    "academicDetails": {
      "usi": "1234567890",
      "highestEducation": "Year 12"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Create Application
```http
POST /applications
```

**Request Body:**
```json
{
  "clientId": "uuid",
  "programId": "uuid",
  "personalDetails": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+61412345678",
    "dateOfBirth": "1990-01-01",
    "gender": "male"
  },
  "academicDetails": {
    "usi": "1234567890",
    "highestEducation": "Year 12"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "draft",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Update Application
```http
PUT /applications/{id}
```

**Path Parameters:**
- `id`: Application UUID

**Request Body:**
```json
{
  "personalDetails": {
    "firstName": "John",
    "lastName": "Smith"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

#### Submit Application
```http
POST /applications/{id}/submit
```

**Path Parameters:**
- `id`: Application UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "submitted",
    "submittedAt": "2024-01-15T11:00:00Z"
  }
}
```

#### Approve Application
```http
POST /applications/{id}/approve
```

**Path Parameters:**
- `id`: Application UUID

**Request Body:**
```json
{
  "approvedBy": "uuid",
  "notes": "Application approved"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "approved",
    "approvedAt": "2024-01-15T12:00:00Z"
  }
}
```

### Clients API

#### Get All Clients
```http
GET /clients
```

**Query Parameters:**
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page
- `search` (optional): Search term for filtering

**Response:**
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "+61412345678",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

#### Get Client by ID
```http
GET /clients/{id}
```

**Path Parameters:**
- `id`: Client UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+61412345678",
    "dateOfBirth": "1990-01-01",
    "gender": "male",
    "addresses": [
      {
        "id": "uuid",
        "type": "primary",
        "street": "123 Main St",
        "city": "Melbourne",
        "state": "VIC",
        "postcode": "3000",
        "country": "AU"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Create Client
```http
POST /clients
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+61412345678",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "addresses": [
    {
      "type": "primary",
      "street": "123 Main St",
      "city": "Melbourne",
      "state": "VIC",
      "postcode": "3000",
      "country": "AU"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Agents API

#### Get All Agents
```http
GET /agents
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "uuid",
        "name": "Agent Name",
        "email": "agent@example.com",
        "phone": "+61412345678",
        "commissionRate": 0.05,
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

#### Create Agent
```http
POST /agents
```

**Request Body:**
```json
{
  "name": "Agent Name",
  "email": "agent@example.com",
  "phone": "+61412345678",
  "commissionRate": 0.05
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Programs API

#### Get All Programs
```http
GET /programs
```

**Response:**
```json
{
  "success": true,
  "data": {
    "programs": [
      {
        "id": "uuid",
        "name": "Certificate III in Business",
        "code": "BSB30120",
        "description": "This qualification reflects the role of individuals who apply a broad range of competencies in a varied work context using some discretion, judgment and relevant theoretical knowledge.",
        "duration": 12,
        "units": [
          {
            "id": "uuid",
            "code": "BSBCRT311",
            "name": "Apply critical thinking skills in a team environment",
            "type": "core"
          }
        ]
      }
    ]
  }
}
```

#### Get Course Offerings
```http
GET /course-offerings
```

**Query Parameters:**
- `programId` (optional): Filter by program ID
- `locationId` (optional): Filter by location ID

**Response:**
```json
{
  "success": true,
  "data": {
    "courseOfferings": [
      {
        "id": "uuid",
        "programId": "uuid",
        "locationId": "uuid",
        "startDate": "2024-02-01",
        "endDate": "2024-12-31",
        "tuitionFee": 5000.00,
        "isActive": true
      }
    ]
  }
}
```

### Reference Data API

#### Get Reference Data
```http
GET /reference-data/{codeType}
```

**Path Parameters:**
- `codeType`: Type of reference data (countries, languages, etc.)

**Response:**
```json
{
  "success": true,
  "data": {
    "codes": [
      {
        "code": "AU",
        "name": "Australia",
        "description": "Commonwealth of Australia"
      }
    ]
  }
}
```

## Data Models

### Application Model

```typescript
interface Application {
  id: string
  clientId: string
  programId: string
  agentId?: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  personalDetails: PersonalDetails
  academicDetails: AcademicDetails
  programDetails: ProgramDetails
  financialDetails: FinancialDetails
  createdAt: string
  updatedAt: string
  submittedAt?: string
  approvedAt?: string
  approvedBy?: string
}

interface PersonalDetails {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  addresses: Address[]
}

interface AcademicDetails {
  usi: string
  highestEducation: string
  previousQualifications?: string[]
}

interface ProgramDetails {
  programId: string
  courseOfferingId: string
  startDate: string
  endDate: string
}

interface FinancialDetails {
  paymentPlanId: string
  tuitionFee: number
  paymentMethod: string
}
```

### Client Model

```typescript
interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  addresses: Address[]
  avetmissDetails?: AvetmissDetails
  cricosDetails?: CricosDetails
  createdAt: string
  updatedAt: string
}

interface Address {
  id: string
  type: 'primary' | 'secondary'
  street: string
  city: string
  state: string
  postcode: string
  country: string
}

interface AvetmissDetails {
  clientId: string
  indigenousStatus: string
  disabilityFlag: boolean
  priorEducation: string
  employmentStatus: string
  languageSpokenAtHome: string
  countryOfBirth: string
  yearOfArrival?: number
}

interface CricosDetails {
  clientId: string
  passportNumber: string
  passportCountry: string
  visaType: string
  visaExpiryDate: string
  emergencyContact: string
  emergencyPhone: string
}
```

### Agent Model

```typescript
interface Agent {
  id: string
  name: string
  email: string
  phone: string
  commissionRate: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

### Program Model

```typescript
interface Program {
  id: string
  name: string
  code: string
  description: string
  duration: number
  units: Unit[]
  createdAt: string
  updatedAt: string
}

interface Unit {
  id: string
  code: string
  name: string
  description: string
  type: 'core' | 'elective'
  hours: number
}
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Common Error Scenarios

#### Validation Errors
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "phone",
        "message": "Phone number is required"
      }
    ]
  }
}
```

#### Authentication Errors
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### Resource Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Application not found"
  }
}
```

## Rate Limiting

### Rate Limits

- **General API**: 1000 requests per hour per user
- **Authentication**: 10 requests per minute per IP
- **File Upload**: 10 requests per minute per user

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later."
  }
}
```

## Integration Examples

### Frontend Integration

#### React Hook for Applications

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export const useApplications = (params?: ApplicationParams) => {
  return useQuery({
    queryKey: ['applications', params],
    queryFn: () => apiClient.getApplications(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCreateApplication = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateApplicationData) => 
      apiClient.createApplication(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}
```

#### API Client Implementation

```typescript
class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setToken(token: string) {
    this.token = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'API request failed')
    }

    return response.json()
  }

  async getApplications(params?: ApplicationParams) {
    const queryString = params ? `?${new URLSearchParams(params)}` : ''
    return this.request<ApplicationsResponse>(`/applications${queryString}`)
  }

  async createApplication(data: CreateApplicationData) {
    return this.request<CreateApplicationResponse>('/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

export const apiClient = new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL!)
```

### Backend Integration

#### Supabase Edge Function

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { Database } from '../_shared/database.types.ts'

const supabase = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
```

## SDK and Libraries

### TypeScript SDK

```typescript
// Install the SDK
npm install @xportal/sms-sdk

// Use the SDK
import { XPortalSMS } from '@xportal/sms-sdk'

const client = new XPortalSMS({
  baseUrl: 'https://your-project.supabase.co/functions/v1',
  apiKey: 'your-api-key'
})

// Create application
const application = await client.applications.create({
  clientId: 'uuid',
  programId: 'uuid',
  personalDetails: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com'
  }
})
```

### React Hooks Library

```typescript
// Install the hooks library
npm install @xportal/sms-hooks

// Use the hooks
import { useApplications, useCreateApplication } from '@xportal/sms-hooks'

function ApplicationsPage() {
  const { data: applications, isLoading } = useApplications()
  const createApplication = useCreateApplication()

  const handleCreate = async (data: CreateApplicationData) => {
    await createApplication.mutateAsync(data)
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {applications?.map(app => (
        <div key={app.id}>{app.personalDetails.firstName}</div>
      ))}
    </div>
  )
}
```

## Testing

### Postman Collection

```json
{
  "info": {
    "name": "XPortal SMS API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Applications",
      "item": [
        {
          "name": "Get All Applications",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "url": {
              "raw": "{{base_url}}/applications",
              "host": ["{{base_url}}"],
              "path": ["applications"]
            }
          }
        }
      ]
    }
  ]
}
```

### Automated Testing

```typescript
// tests/api/applications.test.ts
import { describe, it, expect } from 'vitest'
import { apiClient } from '@/lib/api-client'

describe('Applications API', () => {
  it('should create application', async () => {
    const applicationData = {
      clientId: 'uuid',
      programId: 'uuid',
      personalDetails: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      }
    }

    const result = await apiClient.createApplication(applicationData)
    
    expect(result.success).toBe(true)
    expect(result.data.id).toBeDefined()
  })
})
```

## Troubleshooting

### Common Issues

#### Authentication Issues

**Problem**: 401 Unauthorized errors
**Solution**: 
- Check if JWT token is valid
- Ensure token is included in Authorization header
- Verify token hasn't expired

#### Validation Errors

**Problem**: 400 Validation errors
**Solution**:
- Check request body format
- Verify required fields are present
- Ensure data types are correct

#### Rate Limiting

**Problem**: 429 Rate limit exceeded
**Solution**:
- Implement exponential backoff
- Reduce request frequency
- Use pagination for large datasets

### Debugging Tips

#### Enable Debug Logging

```typescript
// Enable debug logging
const apiClient = new ApiClient(baseUrl, {
  debug: true,
  logLevel: 'debug'
})
```

#### Check Network Requests

```typescript
// Log all requests
apiClient.onRequest((request) => {
  console.log('Request:', request)
})

apiClient.onResponse((response) => {
  console.log('Response:', response)
})
```

#### Validate Data

```typescript
// Validate data before sending
import { z } from 'zod'

const applicationSchema = z.object({
  clientId: z.string().uuid(),
  programId: z.string().uuid(),
  personalDetails: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email()
  })
})

const validatedData = applicationSchema.parse(applicationData)
```

## Support

### Getting Help

- Check the API documentation
- Review error messages and status codes
- Check the troubleshooting section
- Contact the development team

### Reporting Issues

- Use the issue tracker
- Provide detailed error messages
- Include request/response examples
- Describe steps to reproduce

## Conclusion

This API reference provides comprehensive documentation for integrating with the XPortal SMS system. Follow the examples and best practices outlined in this guide to ensure successful integration.

For additional support or questions, please refer to the project documentation or contact the development team.
