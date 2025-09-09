# XPortal Student Management System - System Architecture

## Architecture Overview

The XPortal Student Management System is built on a modern, scalable architecture that prioritizes compliance, data integrity, and user experience. The system follows a microservices-oriented approach using Supabase as the backend platform, with a clear separation of concerns across multiple layers.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14 App Router │ React Components │ ShadCN UI │ Tailwind │
├─────────────────────────────────────────────────────────────────┤
│                        API Gateway Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Edge Functions │ OpenAPI 3.0 │ JWT Authentication    │
├─────────────────────────────────────────────────────────────────┤
│                        Business Logic Layer                    │
├─────────────────────────────────────────────────────────────────┤
│  TypeScript │ Zod Validation │ Business Rules │ Error Handling  │
├─────────────────────────────────────────────────────────────────┤
│                        Data Access Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  Kysely Query Builder │ PostgreSQL │ Database Functions        │
├─────────────────────────────────────────────────────────────────┤
│                        Database Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL │ Multi-Schema Design │ Triggers │ Audit Trails    │
└─────────────────────────────────────────────────────────────────┘
```

## Core Architectural Principles

### 1. Multi-Schema Data Segregation

The database architecture enforces strict separation of concerns through five distinct schemas:

#### Core Schema (`core`)
- **Purpose**: Single source of truth for all entities
- **Tables**: `clients`, `programs`, `subjects`, `locations`, `addresses`, `organisations`
- **Integrity**: All other schemas reference this schema via foreign keys
- **Principle**: An entity exists exactly once in the core schema

#### SMS Operations Schema (`sms_op`)
- **Purpose**: Day-to-day operational data
- **Tables**: `enrolments`, `course_offerings`, `staff`, `invoices`, `sessions`
- **Integrity**: References core entities, contains transactional data
- **Principle**: Dynamic, changeable operational information

#### AVETMISS Schema (`avetmiss`)
- **Purpose**: Live compliance staging area
- **Tables**: `client_avetmiss_details`, `training_activities`, `program_completions`
- **Integrity**: Direct foreign key links to core entities
- **Principle**: Clean, validated data ready for government reporting

#### AVETMISS Submissions Schema (`avetmiss_submissions`)
- **Purpose**: Immutable historical records
- **Tables**: `submissions`, `snapshot_nat00010`, `snapshot_nat00120`
- **Integrity**: Point-in-time snapshots of avetmiss data
- **Principle**: Never modified, only appended to

#### Security Schema (`security`)
- **Purpose**: User management and access control
- **Tables**: `users`, `roles`, `user_roles`
- **Integrity**: Links to core clients or sms_op staff
- **Principle**: Centralized authentication and authorization

### 2. Database-Enforced Integrity

#### Foreign Key Constraints
```sql
-- Example: Enforcing single source of truth
CONSTRAINT fk_enrolment_core_client
    FOREIGN KEY(client_id)
    REFERENCES core.clients(id)
    ON DELETE CASCADE
```

#### Check Constraints
```sql
-- Example: Enforcing business rules
CONSTRAINT check_invoice_status
    CHECK (status IN ('Draft', 'Issued', 'Paid', 'Partially Paid', 'Overdue', 'Void'))
```

#### Audit Triggers
```sql
-- Example: Automatic audit logging
CREATE TRIGGER clients_audit_trigger
AFTER UPDATE ON core.clients
FOR EACH ROW
EXECUTE FUNCTION core.log_client_changes();
```

### 3. API-Centric Logic

#### RESTful Design
- **Resource-Based URLs**: `/applications`, `/clients`, `/programs`
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE
- **Status Codes**: Comprehensive HTTP status code usage
- **Error Handling**: Detailed error responses with actionable messages

#### OpenAPI Specification
- **Version 3.0**: Modern API specification standard
- **Type Generation**: Automatic TypeScript type generation
- **Validation**: Runtime validation using Zod schemas
- **Documentation**: Self-documenting API with examples

## Database Architecture

### Schema Design Philosophy

#### Single Source of Truth
Every entity in the system exists exactly once in the `core` schema. This prevents data duplication and ensures consistency across the entire application.

#### Referential Integrity
All foreign key relationships are enforced at the database level with appropriate cascade rules:
- **ON DELETE CASCADE**: For dependent data (e.g., client addresses)
- **ON DELETE RESTRICT**: For critical relationships (e.g., enrolments with payments)
- **ON DELETE SET NULL**: For optional relationships (e.g., agent references)

#### Immutable Audit Trails
Critical data changes are automatically logged through database triggers, creating an immutable audit trail for compliance purposes.

### Core Tables

#### Clients Table (`core.clients`)
```sql
CREATE TABLE core.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_identifier character varying NOT NULL UNIQUE,
    unique_student_identifier character varying UNIQUE,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    date_of_birth date NOT NULL,
    gender character varying NOT NULL,
    primary_email character varying UNIQUE,
    primary_phone character varying,
    usi_verification_status character varying DEFAULT 'Unverified',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### Programs Table (`core.programs`)
```sql
CREATE TABLE core.programs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    program_identifier character varying NOT NULL UNIQUE,
    program_name character varying NOT NULL,
    status text NOT NULL DEFAULT 'Current',
    tga_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### Enrolments Table (`sms_op.enrolments`)
```sql
CREATE TABLE sms_op.enrolments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL,
    course_offering_id uuid NOT NULL,
    agent_id uuid,
    enrolment_date date NOT NULL DEFAULT CURRENT_DATE,
    status text NOT NULL DEFAULT 'Pending',
    agent_commission_rate_snapshot numeric(5, 2),
    tuition_fee_snapshot numeric(10, 2),
    created_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_enrolment_core_client
        FOREIGN KEY(client_id) REFERENCES core.clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_enrolment_course_offering
        FOREIGN KEY(course_offering_id) REFERENCES sms_op.course_offerings(id),
    CONSTRAINT fk_enrolment_agent
        FOREIGN KEY(agent_id) REFERENCES core.agents(id) ON DELETE SET NULL
);
```

### Advanced Features

#### Program-Subject Relationships
```sql
CREATE TABLE core.program_subjects (
    program_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    unit_type text NOT NULL CHECK (unit_type IN ('Core', 'Elective')),
    elective_group text,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    PRIMARY KEY (program_id, subject_id),
    CONSTRAINT fk_program
        FOREIGN KEY(program_id) REFERENCES core.programs(id) ON DELETE CASCADE,
    CONSTRAINT fk_subject
        FOREIGN KEY(subject_id) REFERENCES core.subjects(id) ON DELETE CASCADE
);
```

#### Financial Management
```sql
CREATE TABLE sms_op.invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrolment_id uuid NOT NULL,
    invoice_number text NOT NULL UNIQUE,
    issue_date date NOT NULL DEFAULT CURRENT_DATE,
    due_date date,
    total_amount numeric(10, 2) NOT NULL,
    amount_paid numeric(10, 2) NOT NULL DEFAULT 0.00,
    status text NOT NULL DEFAULT 'Draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_invoice_enrolment
        FOREIGN KEY(enrolment_id) REFERENCES sms_op.enrolments(id),
    CONSTRAINT check_invoice_status
        CHECK (status IN ('Draft', 'Issued', 'Paid', 'Partially Paid', 'Overdue', 'Void'))
);
```

## API Architecture

### Endpoint Design

#### Resource-Based URLs
```
GET    /applications              # List applications
POST   /applications              # Create application
GET    /applications/{id}         # Get application
PATCH  /applications/{id}         # Update application
POST   /applications/{id}/submit  # Submit application
POST   /applications/{id}/approve # Approve application
```

#### Nested Resources
```
GET    /clients/{id}/notes        # Get client notes
POST   /clients/{id}/notes        # Add client note
GET    /enrolments/{id}/subjects  # Get enrolment subjects
PUT    /enrolments/{id}/subjects/{subjectId}/outcome # Record outcome
```

### Request/Response Patterns

#### Standard Response Format
```typescript
interface ApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

#### Error Response Format
```typescript
interface ErrorResponse {
  message: string;
  errors: Array<{
    field: string;
    message: string;
  }>;
}
```

### Authentication & Authorization

#### JWT Token Structure
```typescript
interface JWTPayload {
  sub: string;        // User ID
  email: string;      // User email
  role: string;       // User role
  iat: number;        // Issued at
  exp: number;        // Expires at
}
```

#### Role-Based Access Control
- **Admin**: Full system access
- **Trainer**: Academic delivery functions
- **Agent**: Student management and applications
- **Student**: Limited self-service access

## Frontend Architecture

### Component Architecture

#### Atomic Design Principles
```
Atoms: Button, Input, Label, Icon
Molecules: FormField, SearchBox, StatusBadge
Organisms: DataTable, FormWizard, Navigation
Templates: PageLayout, DashboardLayout
Pages: ApplicationsPage, StudentsPage, ProgramsPage
```

#### Component Structure
```typescript
// Example: ApplicationForm component
interface ApplicationFormProps {
  initialData?: Partial<ApplicationData>;
  onSubmit: (data: ApplicationData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  // Component implementation
};
```

### State Management

#### Client State (Zustand)
```typescript
interface ApplicationStore {
  currentApplication: Application | null;
  applications: Application[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentApplication: (application: Application) => void;
  fetchApplications: () => Promise<void>;
  createApplication: (data: ApplicationData) => Promise<void>;
  updateApplication: (id: string, data: Partial<ApplicationData>) => Promise<void>;
}
```

#### Server State (React Query)
```typescript
// Example: Applications query
const useApplications = (params: ListApplicationsParams) => {
  return useQuery({
    queryKey: ['applications', params],
    queryFn: () => fetchApplications(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

### Form Management

#### React Hook Form Integration
```typescript
const ApplicationForm = () => {
  const form = useForm<ApplicationData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      personalDetails: {},
      address: {},
      avetmissDetails: {},
    },
  });

  const onSubmit = (data: ApplicationData) => {
    // Handle form submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
};
```

#### Validation with Zod
```typescript
const applicationSchema = z.object({
  personalDetails: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z.date(),
    gender: z.enum(['M', 'F', 'X']),
  }),
  address: z.object({
    residential: addressSchema,
    isPostalSameAsResidential: z.boolean(),
    postal: addressSchema.optional(),
  }),
});
```

## Security Architecture

### Authentication Flow

#### Login Process
1. User submits credentials
2. Supabase validates credentials
3. JWT token issued with user claims
4. Token stored in secure HTTP-only cookie
5. Token included in subsequent API requests

#### Token Refresh
```typescript
const refreshToken = async () => {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) throw error;
  return data.session;
};
```

### Authorization

#### Role-Based Permissions
```typescript
const permissions = {
  admin: ['*'], // All permissions
  trainer: ['read:students', 'update:attendance', 'update:grades'],
  agent: ['read:applications', 'create:applications', 'update:applications'],
  student: ['read:own:profile', 'update:own:profile'],
};
```

#### Route Protection
```typescript
const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, role } = useAuth();
  
  if (!user || !hasPermission(role, requiredRole)) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};
```

### Data Security

#### Encryption
- **At Rest**: Database-level encryption for sensitive fields
- **In Transit**: HTTPS/TLS for all communications
- **Application Level**: Sensitive data encryption before storage

#### Input Validation
```typescript
const validateInput = (data: unknown, schema: ZodSchema) => {
  try {
    return schema.parse(data);
  } catch (error) {
    throw new ValidationError('Invalid input data', error);
  }
};
```

## Performance Architecture

### Database Optimization

#### Indexing Strategy
```sql
-- Example: Composite index for common queries
CREATE INDEX idx_enrolments_client_status 
ON sms_op.enrolments(client_id, status);

-- Example: Partial index for active records
CREATE INDEX idx_active_applications 
ON sms_op.applications(id) 
WHERE status = 'Active';
```

#### Query Optimization
```typescript
// Example: Optimized query with joins
const getEnrolmentWithDetails = async (enrolmentId: string) => {
  return await db
    .selectFrom('sms_op.enrolments')
    .innerJoin('core.clients', 'core.clients.id', 'sms_op.enrolments.client_id')
    .innerJoin('sms_op.course_offerings', 'sms_op.course_offerings.id', 'sms_op.enrolments.course_offering_id')
    .innerJoin('core.programs', 'core.programs.id', 'sms_op.course_offerings.program_id')
    .select([
      'sms_op.enrolments.id',
      'sms_op.enrolments.status',
      'core.clients.first_name',
      'core.clients.last_name',
      'core.programs.program_name',
    ])
    .where('sms_op.enrolments.id', '=', enrolmentId)
    .executeTakeFirst();
};
```

### Frontend Performance

#### Code Splitting
```typescript
// Lazy loading for heavy components
const ApplicationWizard = lazy(() => import('./ApplicationWizard'));
const ReportsDashboard = lazy(() => import('./ReportsDashboard'));
```

#### Caching Strategy
```typescript
// React Query caching configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

## Scalability Architecture

### Horizontal Scaling

#### Database Scaling
- **Read Replicas**: Separate read-only database instances
- **Connection Pooling**: Efficient database connection management
- **Partitioning**: Large table partitioning by date or region

#### API Scaling
- **Load Balancing**: Multiple API instances behind load balancer
- **Caching**: Redis for frequently accessed data
- **CDN**: Static asset delivery optimization

### Vertical Scaling

#### Resource Optimization
- **Memory Management**: Efficient memory usage patterns
- **CPU Optimization**: Optimized algorithms and data structures
- **Storage Optimization**: Efficient data storage and retrieval

## Monitoring & Observability

### Application Monitoring

#### Metrics Collection
```typescript
// Example: Custom metrics
const trackApplicationCreated = (applicationId: string) => {
  analytics.track('application_created', {
    application_id: applicationId,
    timestamp: new Date().toISOString(),
  });
};
```

#### Error Tracking
```typescript
// Example: Error boundary with logging
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application error:', error, errorInfo);
    // Send to error tracking service
  }
}
```

### Database Monitoring

#### Query Performance
```sql
-- Example: Query performance monitoring
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

#### Connection Monitoring
```sql
-- Example: Connection monitoring
SELECT 
  state,
  count(*) as connection_count
FROM pg_stat_activity
GROUP BY state;
```

## Deployment Architecture

### Environment Strategy

#### Development Environment
- **Local Supabase**: Docker-based local development
- **Hot Reloading**: Fast development iteration
- **Debug Tools**: Comprehensive debugging capabilities

#### Staging Environment
- **Production-like**: Mirrors production configuration
- **Testing**: Comprehensive testing before production
- **Data**: Anonymized production data for testing

#### Production Environment
- **High Availability**: Multiple availability zones
- **Backup Strategy**: Regular automated backups
- **Monitoring**: Comprehensive monitoring and alerting

### CI/CD Pipeline

#### Build Process
```yaml
# Example: GitHub Actions workflow
name: Build and Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build application
        run: npm run build
```

#### Deployment Strategy
- **Blue-Green Deployment**: Zero-downtime deployments
- **Rollback Capability**: Quick rollback to previous version
- **Health Checks**: Automated health verification

## Conclusion

The XPortal Student Management System architecture is designed to be robust, scalable, and maintainable while meeting the complex requirements of Australian RTOs. The multi-schema database design ensures data integrity and compliance, while the modern API and frontend architecture provides an excellent user experience.

Key architectural strengths:
- **Data Integrity**: Database-enforced constraints and audit trails
- **Type Safety**: End-to-end TypeScript implementation
- **Scalability**: Horizontal and vertical scaling capabilities
- **Security**: Comprehensive authentication and authorization
- **Performance**: Optimized queries and caching strategies
- **Maintainability**: Clear separation of concerns and modular design

This architecture provides a solid foundation for the current requirements while remaining flexible enough to accommodate future growth and feature additions.

---

*This document provides a comprehensive overview of the XPortal Student Management System architecture. For detailed implementation information, please refer to the specific development documentation.*
