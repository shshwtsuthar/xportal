# XPortal Student Management System - Backend Development

## Backend Architecture Overview

The XPortal backend is built on Supabase Edge Functions using Deno runtime, providing a serverless, scalable API layer. The backend follows a microservices-oriented architecture with clear separation of concerns, type safety, and comprehensive error handling.

### Technology Stack

#### Core Technologies
- **Deno**: Modern JavaScript/TypeScript runtime
- **Supabase Edge Functions**: Serverless function execution
- **PostgreSQL**: Primary database with advanced features
- **TypeScript**: Type-safe development throughout
- **OpenAPI 3.0**: API specification and documentation

#### Supporting Libraries
- **Kysely**: Type-safe SQL query builder
- **Zod**: Runtime validation and type inference
- **JWT**: JSON Web Token authentication
- **CORS**: Cross-origin resource sharing

## Development Workflow

### 1. API-First Development

#### OpenAPI Specification
The backend development follows an API-first approach where the OpenAPI specification serves as the single source of truth:

```yaml
# Example: Application endpoint specification
/applications:
  get:
    summary: List All Applications
    description: Returns a paginated list of all applications
    tags: [Applications & Enrolments]
    security:
      - bearerAuth: [admin, agent]
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          minimum: 1
          default: 1
      - name: limit
        in: query
        schema:
          type: integer
          minimum: 1
          maximum: 100
          default: 20
    responses:
      '200':
        description: A paginated list of applications
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ApplicationListResponse'
```

#### Type Generation
TypeScript types are automatically generated from the OpenAPI specification:

```bash
# Generate types for backend
npx openapi-typescript ./openapi.yaml --output ./supabase/functions/_shared/api.types.ts
```

### 2. Function Structure

#### Edge Function Organization
```
supabase/functions/
├── _shared/                 # Shared utilities and types
│   ├── api.types.ts        # Generated API types
│   ├── database.types.ts   # Database types
│   ├── db.ts              # Database connection
│   ├── errors.ts          # Error handling utilities
│   ├── handler.ts         # Request handler utilities
│   ├── utils.ts           # General utilities
│   └── validators.ts      # Zod validation schemas
├── applications/           # Application management
│   └── index.ts
├── clients/               # Client management
│   └── index.ts
├── programs/              # Program management
│   └── index.ts
└── reference-data/        # Reference data
    └── index.ts
```

#### Function Template
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { Database } from '../_shared/database.types.ts';

interface RequestBody {
  // Define request body interface
}

interface ResponseData {
  // Define response data interface
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Parse request body
    const body: RequestBody = await req.json();

    // Validate input
    // ... validation logic

    // Execute business logic
    // ... business logic

    // Return response
    return new Response(
      JSON.stringify({ data: responseData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
```

## Database Integration

### Kysely Query Builder

#### Database Connection
```typescript
// supabase/functions/_shared/db.ts
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './database.types.ts';

const pool = new Pool({
  connectionString: Deno.env.get('DATABASE_URL'),
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
});
```

#### Type-Safe Queries
```typescript
// Example: Get applications with pagination
const getApplications = async (params: {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}) => {
  const { page, limit, status, search } = params;
  const offset = (page - 1) * limit;

  let query = db
    .selectFrom('sms_op.applications')
    .leftJoin('core.clients', 'core.clients.id', 'sms_op.applications.created_client_id')
    .leftJoin('core.programs', 'core.programs.id', 'sms_op.applications.application_payload->enrolmentDetails->programId')
    .leftJoin('core.agents', 'core.agents.id', 'sms_op.applications.application_payload->agentId')
    .select([
      'sms_op.applications.id',
      'sms_op.applications.status',
      'sms_op.applications.created_at',
      'sms_op.applications.updated_at',
      'core.clients.first_name',
      'core.clients.last_name',
      'core.clients.primary_email',
      'core.programs.program_name',
      'core.agents.agent_name',
    ]);

  // Apply filters
  if (status) {
    query = query.where('sms_op.applications.status', '=', status);
  }

  if (search) {
    query = query.where((eb) =>
      eb.or([
        eb('core.clients.first_name', 'ilike', `%${search}%`),
        eb('core.clients.last_name', 'ilike', `%${search}%`),
        eb('core.clients.primary_email', 'ilike', `%${search}%`),
      ])
    );
  }

  // Get total count
  const totalQuery = query.select(db.fn.count('sms_op.applications.id').as('total'));
  const totalResult = await totalQuery.executeTakeFirst();
  const total = Number(totalResult?.total || 0);

  // Get paginated results
  const applications = await query
    .orderBy('sms_op.applications.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute();

  return {
    data: applications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrevious: page > 1,
    },
  };
};
```

### Database Transactions

#### Transaction Management
```typescript
// Example: Create application with transaction
const createApplication = async (applicationData: ApplicationData) => {
  return await db.transaction().execute(async (trx) => {
    // Create application record
    const application = await trx
      .insertInto('sms_op.applications')
      .values({
        status: 'Draft',
        application_payload: applicationData,
        created_by_staff_id: applicationData.createdByStaffId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Create audit log entry
    await trx
      .insertInto('core.audit_logs')
      .values({
        entity_type: 'application',
        entity_id: application.id,
        action: 'created',
        changes: applicationData,
        created_by: applicationData.createdByStaffId,
      })
      .execute();

    return application;
  });
};
```

## Validation & Error Handling

### Zod Validation Schemas

#### Input Validation
```typescript
// supabase/functions/_shared/validators.ts
import { z } from 'https://deno.land/x/zod@v3.16.1/mod.ts';

export const ApplicationCreateSchema = z.object({
  personalDetails: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    gender: z.enum(['M', 'F', 'X'], {
      errorMap: () => ({ message: 'Gender must be M, F, or X' }),
    }),
    primaryEmail: z.string().email('Invalid email format'),
  }),
  address: z.object({
    residential: AddressSchema,
    isPostalSameAsResidential: z.boolean(),
    postal: AddressSchema.optional(),
  }),
  avetmissDetails: z.object({
    countryOfBirthId: z.string().min(1, 'Country of birth is required'),
    languageAtHomeId: z.string().min(1, 'Language at home is required'),
    indigenousStatusId: z.string().min(1, 'Indigenous status is required'),
    highestSchoolLevelId: z.string().min(1, 'Highest school level is required'),
    isAtSchool: z.boolean(),
    hasDisability: z.boolean(),
    disabilityTypeIds: z.array(z.string()).optional(),
    hasPriorEducation: z.boolean(),
    priorEducationCodes: z.array(z.string()).optional(),
    labourForceId: z.string().min(1, 'Labour force status is required'),
  }),
  enrolmentDetails: z.object({
    programId: z.string().uuid('Invalid program ID'),
    courseOfferingId: z.string().uuid('Invalid course offering ID'),
    subjectStructure: z.object({
      coreSubjectIds: z.array(z.string().uuid()),
      electiveSubjectIds: z.array(z.string().uuid()),
    }),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    expectedCompletionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    deliveryLocationId: z.string().uuid('Invalid delivery location ID'),
    deliveryModeId: z.string().min(1, 'Delivery mode is required'),
    fundingSourceId: z.string().min(1, 'Funding source is required'),
    studyReasonId: z.string().min(1, 'Study reason is required'),
    isVetInSchools: z.boolean().default(false),
  }),
});

export const ApplicationUpdateSchema = ApplicationCreateSchema.partial();

export const ApplicationSubmitSchema = z.object({
  // Validation for submission
  personalDetails: ApplicationCreateSchema.shape.personalDetails,
  address: ApplicationCreateSchema.shape.address,
  avetmissDetails: ApplicationCreateSchema.shape.avetmissDetails,
  enrolmentDetails: ApplicationCreateSchema.shape.enrolmentDetails,
});
```

#### Validation Middleware
```typescript
// Example: Validation middleware
const validateRequest = <T>(schema: z.ZodSchema<T>) => {
  return (req: Request): T => {
    try {
      return schema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid request data', error.errors);
      }
      throw error;
    }
  };
};
```

### Error Handling

#### Custom Error Classes
```typescript
// supabase/functions/_shared/errors.ts
export class ValidationError extends Error {
  constructor(message: string, public errors: z.ZodError['errors']) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
```

#### Error Response Handler
```typescript
// Example: Error response handler
const handleError = (error: Error): Response => {
  console.error('Error:', error);

  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify({
        message: error.message,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }

  if (error instanceof NotFoundError) {
    return new Response(
      JSON.stringify({ message: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      }
    );
  }

  if (error instanceof UnauthorizedError) {
    return new Response(
      JSON.stringify({ message: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      }
    );
  }

  // Generic server error
  return new Response(
    JSON.stringify({ message: 'Internal server error' }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    }
  );
};
```

## Authentication & Authorization

### JWT Token Handling

#### Token Validation
```typescript
// Example: JWT token validation
const validateToken = async (token: string): Promise<JWTPayload> => {
  try {
    const payload = await jwtVerify(
      token,
      new TextEncoder().encode(Deno.env.get('JWT_SECRET'))
    );
    
    return payload.payload as JWTPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
};
```

#### Role-Based Authorization
```typescript
// Example: Role-based authorization
const requireRole = (allowedRoles: string[]) => {
  return (req: Request, user: JWTPayload) => {
    if (!allowedRoles.includes(user.role)) {
      throw new UnauthorizedError('Insufficient permissions');
    }
  };
};

// Usage in endpoint
const getApplications = async (req: Request) => {
  const user = await validateToken(req.headers.get('Authorization')?.replace('Bearer ', '') || '');
  requireRole(['admin', 'agent'])(req, user);
  
  // Continue with business logic
};
```

### User Context

#### User Information Extraction
```typescript
// Example: Extract user information from token
const getUserContext = async (req: Request): Promise<UserContext> => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new UnauthorizedError('No token provided');
  }

  const payload = await validateToken(token);
  
  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    permissions: getPermissionsForRole(payload.role),
  };
};
```

## Business Logic Implementation

### Application Management

#### Create Application
```typescript
// Example: Create application endpoint
const createApplication = async (req: Request): Promise<Response> => {
  try {
    const user = await getUserContext(req);
    const applicationData = validateRequest(ApplicationCreateSchema)(req);

    // Check if user has permission to create applications
    if (!user.permissions.includes('create:applications')) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    // Create application with transaction
    const application = await db.transaction().execute(async (trx) => {
      // Create application record
      const newApplication = await trx
        .insertInto('sms_op.applications')
        .values({
          status: 'Draft',
          application_payload: applicationData,
          created_by_staff_id: user.userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Create audit log
      await trx
        .insertInto('core.audit_logs')
        .values({
          entity_type: 'application',
          entity_id: newApplication.id,
          action: 'created',
          changes: applicationData,
          created_by: user.userId,
        })
        .execute();

      return newApplication;
    });

    return new Response(
      JSON.stringify({ data: application }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );
  } catch (error) {
    return handleError(error);
  }
};
```

#### Submit Application
```typescript
// Example: Submit application endpoint
const submitApplication = async (req: Request): Promise<Response> => {
  try {
    const user = await getUserContext(req);
    const { applicationId } = req.params;

    // Get application
    const application = await db
      .selectFrom('sms_op.applications')
      .selectAll()
      .where('id', '=', applicationId)
      .executeTakeFirst();

    if (!application) {
      throw new NotFoundError('Application', applicationId);
    }

    // Validate application data
    const validatedData = ApplicationSubmitSchema.parse(application.application_payload);

    // Update application status
    const updatedApplication = await db
      .updateTable('sms_op.applications')
      .set({
        status: 'Submitted',
        updated_at: new Date(),
      })
      .where('id', '=', applicationId)
      .returningAll()
      .executeTakeFirstOrThrow();

    // Create audit log
    await db
      .insertInto('core.audit_logs')
      .values({
        entity_type: 'application',
        entity_id: applicationId,
        action: 'submitted',
        changes: { status: 'Submitted' },
        created_by: user.userId,
      })
      .execute();

    return new Response(
      JSON.stringify({ data: updatedApplication }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return handleError(error);
  }
};
```

### Client Management

#### Get Client Details
```typescript
// Example: Get client details endpoint
const getClientDetails = async (req: Request): Promise<Response> => {
  try {
    const user = await getUserContext(req);
    const { clientId } = req.params;

    // Check permissions
    if (!user.permissions.includes('read:clients')) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    // Get client with all related data
    const client = await db
      .selectFrom('core.clients')
      .leftJoin('core.client_addresses', 'core.client_addresses.client_id', 'core.clients.id')
      .leftJoin('core.addresses', 'core.addresses.id', 'core.client_addresses.address_id')
      .leftJoin('avetmiss.client_avetmiss_details', 'avetmiss.client_avetmiss_details.client_id', 'core.clients.id')
      .leftJoin('cricos.client_details', 'cricos.client_details.client_id', 'core.clients.id')
      .select([
        'core.clients.id',
        'core.clients.client_identifier',
        'core.clients.first_name',
        'core.clients.last_name',
        'core.clients.date_of_birth',
        'core.clients.gender',
        'core.clients.primary_email',
        'core.clients.primary_phone',
        'core.clients.unique_student_identifier',
        'core.clients.usi_verification_status',
        'core.clients.created_at',
        'core.clients.updated_at',
        // Address data
        'core.addresses.street_number',
        'core.addresses.street_name',
        'core.addresses.suburb',
        'core.addresses.state',
        'core.addresses.postcode',
        // AVETMISS data
        'avetmiss.client_avetmiss_details.country_of_birth_id',
        'avetmiss.client_avetmiss_details.language_at_home_id',
        'avetmiss.client_avetmiss_details.indigenous_status_id',
        // CRICOS data
        'cricos.client_details.country_of_citizenship_id',
        'cricos.client_details.passport_number',
        'cricos.client_details.passport_expiry_date',
      ])
      .where('core.clients.id', '=', clientId)
      .executeTakeFirst();

    if (!client) {
      throw new NotFoundError('Client', clientId);
    }

    return new Response(
      JSON.stringify({ data: client }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return handleError(error);
  }
};
```

## Testing Strategy

### Unit Testing

#### Test Structure
```typescript
// Example: Unit test for application creation
import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { createApplication } from './applications.ts';

Deno.test('createApplication - should create application successfully', async () => {
  const mockRequest = new Request('http://localhost:8000/applications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer valid-token',
    },
    body: JSON.stringify({
      personalDetails: {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'M',
        primaryEmail: 'john.doe@example.com',
      },
      address: {
        residential: {
          streetNumber: '123',
          streetName: 'Main Street',
          suburb: 'Sydney',
          state: 'NSW',
          postcode: '2000',
        },
        isPostalSameAsResidential: true,
      },
      avetmissDetails: {
        countryOfBirthId: '1101',
        languageAtHomeId: '1201',
        indigenousStatusId: '4',
        highestSchoolLevelId: '12',
        isAtSchool: false,
        hasDisability: false,
        hasPriorEducation: false,
        labourForceId: '03',
      },
      enrolmentDetails: {
        programId: 'program-uuid',
        courseOfferingId: 'offering-uuid',
        subjectStructure: {
          coreSubjectIds: ['subject-uuid-1'],
          electiveSubjectIds: ['subject-uuid-2'],
        },
        startDate: '2024-02-01',
        expectedCompletionDate: '2024-12-31',
        deliveryLocationId: 'location-uuid',
        deliveryModeId: 'delivery-mode-id',
        fundingSourceId: 'funding-source-id',
        studyReasonId: 'study-reason-id',
        isVetInSchools: false,
      },
    }),
  });

  const response = await createApplication(mockRequest);
  const responseData = await response.json();

  assertEquals(response.status, 201);
  assertExists(responseData.data.id);
  assertEquals(responseData.data.status, 'Draft');
});
```

### Integration Testing

#### Database Integration Tests
```typescript
// Example: Database integration test
Deno.test('getApplications - should return paginated applications', async () => {
  // Setup test data
  await db.insertInto('sms_op.applications').values({
    id: 'test-application-1',
    status: 'Draft',
    application_payload: { /* test data */ },
    created_by_staff_id: 'test-staff-1',
  }).execute();

  // Test the function
  const result = await getApplications({
    page: 1,
    limit: 10,
  });

  assertEquals(result.data.length, 1);
  assertEquals(result.pagination.total, 1);
  assertEquals(result.pagination.page, 1);
  assertEquals(result.pagination.limit, 10);

  // Cleanup
  await db.deleteFrom('sms_op.applications').where('id', '=', 'test-application-1').execute();
});
```

## Performance Optimization

### Database Optimization

#### Query Optimization
```typescript
// Example: Optimized query with proper indexing
const getApplicationsWithDetails = async (params: ListApplicationsParams) => {
  return await db
    .selectFrom('sms_op.applications')
    .leftJoin('core.clients', 'core.clients.id', 'sms_op.applications.created_client_id')
    .leftJoin('core.programs', 'core.programs.id', 'sms_op.applications.application_payload->enrolmentDetails->programId')
    .select([
      'sms_op.applications.id',
      'sms_op.applications.status',
      'sms_op.applications.created_at',
      'core.clients.first_name',
      'core.clients.last_name',
      'core.programs.program_name',
    ])
    .where('sms_op.applications.status', '=', params.status)
    .orderBy('sms_op.applications.created_at', 'desc')
    .limit(params.limit)
    .offset((params.page - 1) * params.limit)
    .execute();
};
```

#### Connection Pooling
```typescript
// Example: Connection pool configuration
const pool = new Pool({
  connectionString: Deno.env.get('DATABASE_URL'),
  max: 20, // Maximum number of connections
  min: 5,  // Minimum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
});
```

### Caching Strategy

#### Response Caching
```typescript
// Example: Response caching for reference data
const getReferenceData = async (codeType: string) => {
  const cacheKey = `reference_data_${codeType}`;
  
  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const data = await db
    .selectFrom('avetmiss.codes')
    .select(['code', 'description'])
    .where('code_type', '=', codeType)
    .where('is_active', '=', true)
    .execute();

  // Cache for 1 hour
  await cache.set(cacheKey, data, 3600);
  
  return data;
};
```

## Monitoring & Logging

### Application Logging

#### Structured Logging
```typescript
// Example: Structured logging
const logApplicationEvent = (event: string, data: any) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    event,
    data,
    service: 'applications-api',
  }));
};

// Usage
logApplicationEvent('application_created', {
  applicationId: application.id,
  userId: user.userId,
  status: application.status,
});
```

#### Error Logging
```typescript
// Example: Error logging with context
const logError = (error: Error, context: any) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
    service: 'applications-api',
  }));
};
```

### Performance Monitoring

#### Query Performance Tracking
```typescript
// Example: Query performance tracking
const trackQueryPerformance = async <T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      event: 'query_performance',
      queryName,
      duration,
      success: true,
    }));
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      event: 'query_performance',
      queryName,
      duration,
      success: false,
      error: error.message,
    }));
    
    throw error;
  }
};
```

## Deployment & Configuration

### Environment Configuration

#### Environment Variables
```typescript
// Example: Environment configuration
const config = {
  database: {
    url: Deno.env.get('DATABASE_URL') || '',
    maxConnections: parseInt(Deno.env.get('DB_MAX_CONNECTIONS') || '20'),
  },
  supabase: {
    url: Deno.env.get('SUPABASE_URL') || '',
    anonKey: Deno.env.get('SUPABASE_ANON_KEY') || '',
  },
  jwt: {
    secret: Deno.env.get('JWT_SECRET') || '',
    expiresIn: Deno.env.get('JWT_EXPIRES_IN') || '24h',
  },
  cors: {
    allowedOrigins: Deno.env.get('CORS_ALLOWED_ORIGINS')?.split(',') || ['*'],
  },
};
```

### Function Deployment

#### Supabase Edge Functions
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy applications

# Deploy with environment variables
supabase functions deploy --env-file .env.local
```

#### Function Configuration
```typescript
// Example: Function configuration
const functionConfig = {
  timeout: 30, // 30 seconds
  memory: 256, // 256 MB
  regions: ['ap-southeast-2'], // Sydney region
  environment: {
    DATABASE_URL: Deno.env.get('DATABASE_URL'),
    JWT_SECRET: Deno.env.get('JWT_SECRET'),
  },
};
```

## Security Best Practices

### Input Sanitization

#### SQL Injection Prevention
```typescript
// Example: Using parameterized queries (Kysely handles this automatically)
const getClientById = async (clientId: string) => {
  return await db
    .selectFrom('core.clients')
    .selectAll()
    .where('id', '=', clientId) // Kysely automatically parameterizes this
    .executeTakeFirst();
};
```

#### XSS Prevention
```typescript
// Example: Input sanitization
const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .substring(0, 1000); // Limit length
};
```

### Rate Limiting

#### Request Rate Limiting
```typescript
// Example: Rate limiting implementation
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (ip: string, limit: number = 100, windowMs: number = 60000) => {
  const now = Date.now();
  const key = ip;
  const current = rateLimiter.get(key);

  if (!current || now > current.resetTime) {
    rateLimiter.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count++;
  return true;
};
```

## Conclusion

The XPortal backend development follows modern best practices with a focus on type safety, performance, and maintainability. The API-first approach ensures consistency between frontend and backend, while the comprehensive error handling and validation provide a robust foundation for the application.

Key strengths of the backend architecture:
- **Type Safety**: End-to-end TypeScript implementation
- **Performance**: Optimized queries and caching strategies
- **Security**: Comprehensive input validation and authentication
- **Maintainability**: Clear separation of concerns and modular design
- **Scalability**: Serverless architecture with automatic scaling
- **Monitoring**: Comprehensive logging and performance tracking

This backend architecture provides a solid foundation for the XPortal Student Management System while remaining flexible enough to accommodate future requirements and growth.

---

*This document provides a comprehensive overview of the XPortal backend development. For detailed implementation examples, please refer to the specific function documentation and code examples.*
