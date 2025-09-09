# XPortal Development Flow

## Overview

This document outlines the recommended development workflow for the XPortal Student Management System (SMS). This API-first, type-safe approach ensures robust, maintainable, and scalable code.

## Development Workflow

### 1. **Plan & Design Phase** 🎯

**Objective**: Define requirements and API contracts before implementation.

**Activities**:
- Identify new endpoints needed
- Design request/response schemas
- Define validation rules and business logic
- Consider error handling scenarios
- Plan data relationships and dependencies

**Deliverables**:
- Endpoint specifications
- Data model designs
- API contract documentation

---

### 2. **API Specification Phase** 📋

**Objective**: Create comprehensive OpenAPI specification that serves as the single source of truth.

**Activities**:
- Update `openapi.yaml` with new endpoints
- Define request/response schemas using OpenAPI 3.0
- Document parameters, validation rules, and examples
- Specify error responses and status codes
- Add detailed descriptions and documentation

**Key File**: `openapi.yaml`

**Example**:
```yaml
paths:
  /applications:
    get:
      summary: List applications
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
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApplicationListResponse'
```

---

### 3. **Type Generation Phase** 🔄

**Objective**: Generate TypeScript types from OpenAPI specification to ensure type safety across both frontend and backend.

**Commands**:
```bash
# Generate types for backend (Supabase Edge Functions)
npx openapi-typescript ./openapi.yaml --output ./supabase/functions/_shared/api.types.ts

# Generate types for frontend (React components and hooks)
npx openapi-typescript ./openapi.yaml --output ./src/types/api.ts
```

**Activities**:
- Run type generation after OpenAPI changes
- Generate types for both backend and frontend
- Verify generated types are correct
- Update imports in backend functions and frontend hooks
- Ensure type consistency across frontend and backend

**Key Files**: 
- `supabase/functions/_shared/api.types.ts` - Backend types
- `src/types/api.ts` - Frontend types

**Benefits**:
- Automatic type generation from API spec
- Prevents type mismatches between frontend and backend
- Enables IntelliSense and compile-time error checking
- Reduces manual type maintenance

---

### 4. **Backend Development Phase** ⚙️

**Objective**: Implement Supabase Edge Functions with type safety and validation.

**Activities**:
- Create/update Supabase Edge Functions in `supabase/functions/`
- Implement business logic using generated types
- Add input validation using Zod schemas
- Handle errors and edge cases
- Write database queries using Kysely

**Validation Commands**:
```bash
# Check specific function
deno check supabase/functions/applications/index.ts

# Check all functions
deno check supabase/functions/*/index.ts
```

**Key Files**:
- `supabase/functions/[function-name]/index.ts`
- `supabase/functions/_shared/validators.ts`
- `supabase/functions/_shared/db.ts`

**Best Practices**:
- Use generated types for request/response validation
- Implement proper error handling
- Add comprehensive logging
- Write database queries with type safety
- Test with Postman collection

---

### 5. **Database Management Phase** 🗄️

**Objective**: Manage database schema and seed data for development and testing.

**Activities**:
- Create/update database migrations
- Add seed data for testing
- Reset database when needed
- Verify data integrity

**Commands**:
```bash
# Reset database with new seed data
supabase db reset

# Apply specific migration
supabase db push
```

**Key Files**:
- `supabase/migrations/`
- `supabase/seed.sql`

---

### 6. **API Testing Phase** 🧪

**Objective**: Validate API functionality using comprehensive test suite.

**Activities**:
- Test all endpoints with Postman collection
- Verify request/response formats
- Test error scenarios and edge cases
- Validate performance and response times
- Check authentication and authorization

**Key Files**:
- `XPortal-Applications-API.postman_collection.json`
- `XPortal Applications API.postman_test_run.json`

**Test Categories**:
- **CRUD Operations**: Create, Read, Update, Delete
- **Filtering & Search**: Pagination, status filters, text search
- **Validation**: Input validation, error handling
- **Performance**: Response times, load testing
- **Edge Cases**: Invalid inputs, missing data, unauthorized access

---

### 7. **Frontend Integration Phase** 🎨

**Objective**: Create React components and hooks to consume backend APIs.

**Activities**:
- Create custom React hooks for API calls
- Implement form validation using React Hook Form + Zod
- Build UI components with Tailwind CSS
- Add state management with Zustand
- Implement error handling and loading states

**Key Directories**:
- `app/students/` - Student management features
- `src/lib/hooks/` - Custom React hooks
- `src/lib/schemas/` - Zod validation schemas
- `src/lib/stores/` - Zustand state management

**Example Hook**:
```typescript
export const useApplications = () => {
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchApplications = async (params: ListApplicationsParams) => {
    setLoading(true);
    try {
      const response = await fetch('/api/applications?' + new URLSearchParams(params));
      const data = await response.json();
      setApplications(data.applications);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return { applications, loading, fetchApplications };
};
```

---

### 8. **UI Development Phase** 🖼️

**Objective**: Create intuitive, accessible user interfaces following design system.

**Activities**:
- Design components using ShadCN UI
- Implement responsive layouts
- Add accessibility features (ARIA labels, keyboard navigation)
- Create form wizards and multi-step processes
- Add loading states and error handling

**Design Principles**:
- **Mobile-first**: Responsive design for all screen sizes
- **Accessibility**: WCAG 2.1 AA compliance
- **Consistency**: Follow ShadCN design system
- **Performance**: Optimize for fast loading and smooth interactions
- **User Experience**: Intuitive navigation and clear feedback

**Key Technologies**:
- **Tailwind CSS**: Utility-first styling
- **ShadCN UI**: Pre-built component library
- **Radix UI**: Accessible component primitives
- **React Hook Form**: Form state management
- **Zod**: Runtime validation

---

### 9. **Testing & Validation Phase** ✅

**Objective**: Ensure end-to-end functionality and quality.

**Activities**:
- Test complete user workflows
- Validate form submissions and data persistence
- Check error handling and edge cases
- Verify responsive design across devices
- Test accessibility with screen readers
- Performance testing and optimization

**Testing Tools**:
- **Postman**: API endpoint testing
- **Browser DevTools**: Frontend debugging
- **Lighthouse**: Performance and accessibility auditing
- **Manual Testing**: User experience validation

---

### 10. **Documentation & Deployment Phase** 📚

**Objective**: Document changes and prepare for deployment.

**Activities**:
- Update API documentation
- Create/update changelog
- Update deployment documentation
- Code review and quality assurance
- Prepare release notes

**Key Files**:
- `CHANGELOG.md`
- `DEPLOYMENT.md`
- `README.md`
- API documentation

---

## Development Commands Reference

### Type Generation
```bash
# Generate types for backend (Supabase Edge Functions)
npx openapi-typescript ./openapi.yaml --output ./supabase/functions/_shared/api.types.ts

# Generate types for frontend (React components and hooks)
npx openapi-typescript ./openapi.yaml --output ./src/types/api.ts
```

### Backend Validation
```bash
# Check specific function
deno check supabase/functions/applications/index.ts

# Check all functions
deno check supabase/functions/*/index.ts
```

### Database Management
```bash
# Reset database with seed data
supabase db reset

# Start local Supabase
supabase start

# Stop local Supabase
supabase stop
```

### Frontend Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run type checking
npm run type-check
```

### Testing
```bash
# Run Postman collection
# (Use Postman GUI or Newman CLI)

# Run frontend tests
npm run test

# Run E2E tests
npm run test:e2e
```

---

## Best Practices

### 1. **API-First Development**
- Always define API contracts before implementation
- Use OpenAPI as the single source of truth
- Generate types automatically from specifications

### 2. **Type Safety**
- Use TypeScript throughout the stack
- Leverage generated types from OpenAPI
- Validate data at runtime with Zod schemas

### 3. **Incremental Development**
- Build features incrementally
- Test each component thoroughly
- Validate with Postman before frontend integration

### 4. **Error Handling**
- Implement comprehensive error handling
- Provide meaningful error messages
- Log errors for debugging and monitoring

### 5. **Testing Strategy**
- Test APIs with Postman collections
- Validate frontend with automated tests
- Perform manual testing for user experience

### 6. **Code Quality**
- Follow consistent coding standards
- Use ESLint and Prettier for formatting
- Write self-documenting code with clear naming

### 7. **Documentation**
- Keep documentation up to date
- Document API changes in changelog
- Provide clear setup and deployment instructions

---

## Workflow Benefits

### ✅ **Type Safety**
- Compile-time error detection
- IntelliSense support
- Reduced runtime errors

### ✅ **API Consistency**
- Single source of truth for API contracts
- Automatic type generation
- Frontend-backend alignment

### ✅ **Development Efficiency**
- Clear development phases
- Automated type generation
- Comprehensive testing tools

### ✅ **Maintainability**
- Well-structured codebase
- Comprehensive documentation
- Consistent patterns and practices

### ✅ **Quality Assurance**
- Multiple validation layers
- Comprehensive testing strategy
- Performance monitoring

---

## Troubleshooting

### Common Issues

1. **Type Generation Errors**
   - Verify OpenAPI spec is valid
   - Check file paths and permissions
   - Regenerate types after schema changes

2. **Deno Check Failures**
   - Fix TypeScript errors
   - Update imports and dependencies
   - Verify type definitions

3. **Database Issues**
   - Reset database with `supabase db reset`
   - Check migration files
   - Verify seed data format

4. **API Testing Failures**
   - Check endpoint URLs and methods
   - Verify request/response formats
   - Test with Postman collection

5. **Frontend Integration Issues**
   - Verify API endpoints are working
   - Check type definitions match
   - Validate form schemas

---

## Conclusion

This development workflow ensures a robust, maintainable, and scalable codebase for the XPortal Student Management System. By following this API-first, type-safe approach, we can deliver high-quality software that meets Australian RTO compliance requirements while providing an excellent user experience.

The workflow emphasizes:
- **Planning before coding**
- **Type safety throughout**
- **Comprehensive testing**
- **Clear documentation**
- **Incremental development**

This approach reduces bugs, improves developer productivity, and ensures long-term maintainability of the system.
