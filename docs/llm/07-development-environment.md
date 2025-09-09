# Development Environment Setup & Deployment

## Overview

This document provides comprehensive guides for setting up the XPortal SMS development environment, including local development, staging, and production deployments. The project uses a modern stack with Supabase, Next.js, and TypeScript.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.17.0 or higher
- **npm**: Version 9.0.0 or higher
- **Docker**: Version 20.10.0 or higher
- **Git**: Version 2.30.0 or higher
- **PowerShell**: Version 7.0+ (Windows)

### Required Software
- **Visual Studio Code**: Recommended IDE with extensions
- **Postman**: API testing and development
- **Docker Desktop**: Container management
- **Supabase CLI**: Local Supabase development
- **Deno**: Runtime for Edge Functions

## Local Development Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/xportal-sms.git
cd xportal-sms

# Install dependencies
npm install
```

### 2. Environment Configuration

#### Create Environment Files

```bash
# Copy environment template
cp .env.example .env.local
cp .env.example .env.development
```

#### Configure Environment Variables

**`.env.local`** (Frontend):
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:54321/functions/v1

# Development Settings
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
```

**`.env.development`** (Backend):
```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
SUPABASE_DB_PASSWORD=postgres

# Supabase Configuration
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# Development Settings
ENVIRONMENT=development
LOG_LEVEL=debug
```

### 3. Database Setup

#### Start Supabase Local Development

```bash
# Initialize Supabase (first time only)
supabase init

# Start Supabase services
supabase start

# Apply migrations
supabase db reset

# Seed database
supabase db seed
```

#### Verify Database Connection

```bash
# Check database status
supabase status

# Connect to database
supabase db connect
```

### 4. Backend Development

#### Start Edge Functions

```bash
# Start Edge Functions in development mode
supabase functions serve

# Start specific function
supabase functions serve --env-file .env.development
```

#### Test Backend APIs

```bash
# Test all functions
supabase functions serve --env-file .env.development --debug

# Test specific function
curl -X POST http://localhost:54321/functions/v1/applications \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 5. Frontend Development

#### Start Development Server

```bash
# Start Next.js development server
npm run dev

# Start with specific port
npm run dev -- -p 3001

# Start with debugging
npm run dev -- --inspect
```

#### Verify Frontend

- Open browser to `http://localhost:3000`
- Check console for errors
- Verify API connectivity
- Test application flow

### 6. Development Tools

#### VS Code Extensions

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "supabase.supabase-vscode",
    "denoland.vscode-deno"
  ]
}
```

#### Postman Collection

```bash
# Import Postman collection
# File: postman/XPortal-SMS-API.postman_collection.json

# Set environment variables
# File: postman/XPortal-SMS-Development.postman_environment.json
```

## Staging Environment

### 1. Supabase Staging Project

#### Create Staging Project

```bash
# Create new Supabase project
supabase projects create xportal-sms-staging

# Link to staging project
supabase link --project-ref your-staging-project-ref
```

#### Deploy to Staging

```bash
# Deploy database migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy

# Deploy database changes
supabase db push --include-all
```

### 2. Frontend Staging

#### Build for Staging

```bash
# Build production bundle
npm run build

# Start production server
npm start

# Test production build
npm run build && npm start
```

#### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to staging
vercel --env staging

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3. Environment Configuration

#### Staging Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key

# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://your-staging-project.supabase.co/functions/v1

# Environment
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=staging
```

## Production Environment

### 1. Supabase Production Project

#### Create Production Project

```bash
# Create production project
supabase projects create xportal-sms-production

# Link to production project
supabase link --project-ref your-production-project-ref
```

#### Production Database Setup

```bash
# Deploy migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy --project-ref your-production-project-ref

# Set up monitoring
supabase projects create --with-monitoring
```

### 2. Frontend Production

#### Production Build

```bash
# Build for production
npm run build

# Analyze bundle
npm run analyze

# Test production build
npm run build && npm start
```

#### Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Set production environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

### 3. Production Configuration

#### Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key

# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://your-production-project.supabase.co/functions/v1

# Environment
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
```

## Database Management

### 1. Migrations

#### Create Migration

```bash
# Create new migration
supabase migration new add_new_table

# Apply migration
supabase db push

# Reset database
supabase db reset
```

#### Migration Best Practices

- Always test migrations in development first
- Use descriptive migration names
- Include rollback scripts
- Test with production-like data

### 2. Seed Data

#### Development Seed Data

```bash
# Apply seed data
supabase db seed

# Custom seed data
supabase db seed --file custom-seed.sql
```

#### Production Data

- Never use development seed data in production
- Use production data migration scripts
- Validate data integrity before deployment

### 3. Backup and Recovery

#### Database Backups

```bash
# Create backup
supabase db dump --file backup.sql

# Restore from backup
supabase db restore --file backup.sql
```

#### Automated Backups

- Set up automated daily backups
- Store backups in secure location
- Test restore procedures regularly

## API Development

### 1. Edge Functions

#### Function Structure

```
supabase/functions/
├── _shared/
│   ├── api.types.ts
│   ├── database.types.ts
│   ├── db.ts
│   ├── errors.ts
│   ├── handler.ts
│   ├── utils.ts
│   └── validators.ts
├── applications/
│   └── index.ts
├── clients/
│   └── index.ts
└── agents/
    └── index.ts
```

#### Function Development

```bash
# Create new function
supabase functions new function-name

# Test function locally
supabase functions serve function-name

# Deploy function
supabase functions deploy function-name
```

### 2. API Testing

#### Postman Testing

```bash
# Import collection
# File: postman/XPortal-SMS-API.postman_collection.json

# Run tests
newman run postman/XPortal-SMS-API.postman_collection.json
```

#### Automated Testing

```bash
# Run API tests
npm run test:api

# Run specific test
npm run test:api -- --grep "applications"
```

## Frontend Development

### 1. Component Development

#### Component Structure

```
components/
├── ui/
│   ├── button.tsx
│   ├── input.tsx
│   └── form.tsx
├── forms/
│   ├── application-form.tsx
│   └── client-form.tsx
└── layout/
    ├── header.tsx
    └── sidebar.tsx
```

#### Component Development

```bash
# Start Storybook
npm run storybook

# Build Storybook
npm run build-storybook
```

### 2. State Management

#### Zustand Stores

```typescript
// stores/application-store.ts
import { create } from 'zustand'

interface ApplicationStore {
  applications: Application[]
  setApplications: (applications: Application[]) => void
}

export const useApplicationStore = create<ApplicationStore>((set) => ({
  applications: [],
  setApplications: (applications) => set({ applications }),
}))
```

#### React Query Integration

```typescript
// hooks/use-applications.ts
import { useQuery } from '@tanstack/react-query'

export const useApplications = () => {
  return useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

## Testing

### 1. Unit Testing

#### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}
```

#### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- --grep "ApplicationForm"
```

### 2. Integration Testing

#### API Testing

```bash
# Test API endpoints
npm run test:api

# Test with specific environment
npm run test:api -- --env staging
```

#### E2E Testing

```bash
# Run Cypress tests
npm run test:e2e

# Run in headless mode
npm run test:e2e:headless
```

## Monitoring and Logging

### 1. Application Monitoring

#### Supabase Monitoring

```bash
# View logs
supabase logs

# View specific function logs
supabase logs --function applications

# View database logs
supabase logs --type database
```

#### Frontend Monitoring

```typescript
// lib/monitoring.ts
export const logError = (error: Error, context: string) => {
  console.error(`[${context}]`, error)
  // Send to monitoring service
}
```

### 2. Performance Monitoring

#### Database Performance

```sql
-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

#### Frontend Performance

```typescript
// lib/performance.ts
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now()
  fn()
  const end = performance.now()
  console.log(`${name} took ${end - start} milliseconds`)
}
```

## Troubleshooting

### 1. Common Issues

#### Database Connection Issues

```bash
# Check Supabase status
supabase status

# Restart Supabase
supabase stop
supabase start

# Check database logs
supabase logs --type database
```

#### Frontend Build Issues

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules
npm install

# Check TypeScript errors
npm run type-check
```

#### API Issues

```bash
# Check function logs
supabase logs --function function-name

# Test function locally
supabase functions serve function-name --debug

# Check environment variables
supabase secrets list
```

### 2. Debugging

#### Backend Debugging

```typescript
// Add debugging to Edge Functions
console.log('Debug info:', { request, response })

// Use Supabase CLI for debugging
supabase functions serve --debug
```

#### Frontend Debugging

```typescript
// Add debugging to React components
console.log('Component state:', state)

// Use React DevTools
// Install React Developer Tools browser extension
```

## Security

### 1. Environment Security

#### Secure Environment Variables

```bash
# Never commit .env files
echo ".env*" >> .gitignore

# Use Supabase secrets for sensitive data
supabase secrets set SECRET_KEY=your-secret-key
```

#### API Security

```typescript
// Validate JWT tokens
const validateToken = (token: string) => {
  // Implement JWT validation
}

// Rate limiting
const rateLimit = (req: Request) => {
  // Implement rate limiting
}
```

### 2. Data Security

#### Database Security

```sql
-- Enable RLS (Row Level Security)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY "Users can view own applications" ON applications
  FOR SELECT USING (auth.uid() = user_id);
```

#### Frontend Security

```typescript
// Sanitize user input
const sanitizeInput = (input: string) => {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}
```

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Edge Functions deployed
- [ ] Frontend build successful
- [ ] Security review completed

### Post-Deployment

- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Logs being collected
- [ ] Performance metrics normal
- [ ] User acceptance testing completed

## Support

### Getting Help

- Check the troubleshooting section
- Review logs for error messages
- Check Supabase documentation
- Contact the development team

### Reporting Issues

- Use the issue tracker
- Provide detailed error messages
- Include relevant logs
- Describe steps to reproduce

## Conclusion

This guide provides comprehensive instructions for setting up and deploying the XPortal SMS project across different environments. Follow the steps carefully and refer to the troubleshooting section if you encounter any issues.

For additional support or questions, please refer to the project documentation or contact the development team.
