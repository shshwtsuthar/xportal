# Application Management Hooks

This directory contains comprehensive React hooks for managing application data and operations in the XPortal Student Management System.

## Overview

The hooks are organized into three main files:

1. **`use-applications-status.ts`** - Data fetching hooks for different application statuses
2. **`use-application-actions.ts`** - Mutation hooks for application actions (approve, reject, submit)
3. **`use-applications-management.ts`** - Combined management hook with full functionality

## Quick Start

### Basic Usage

```tsx
import { useApplicationsManagement } from '@/hooks/use-applications-management';

function ApplicationsPage() {
  const {
    applications,
    stats,
    isLoading,
    handleSearch,
    handleViewChange,
    handleRejectApplication,
    handleApproveApplication,
  } = useApplicationsManagement();

  return (
    <div>
      {/* Your UI components */}
    </div>
  );
}
```

### Individual Hooks

```tsx
import { useDraftApplications, useApplicationStats } from '@/hooks/use-applications-status';
import { useRejectApplication } from '@/hooks/use-application-actions';

function DraftApplicationsList() {
  const { data, isLoading, error } = useDraftApplications({ page: 1, limit: 20 });
  const rejectMutation = useRejectApplication();
  
  // Your component logic
}
```

## Available Hooks

### Data Fetching Hooks (`use-applications-status.ts`)

#### `useDraftApplications(params?)`
Fetches draft applications with optional pagination and search.

**Parameters:**
- `params.page?: number` - Page number (default: 1)
- `params.limit?: number` - Items per page (default: 20)
- `params.search?: string` - Search query

**Returns:**
- `data: ApplicationListResponse` - Paginated list of draft applications
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state
- `refetch: () => void` - Manual refetch function

#### `useSubmittedApplications(params?)`
Fetches submitted applications with optional pagination and search.

#### `useApprovedApplications(params?)`
Fetches approved applications with optional pagination and search.

#### `useApplicationStats()`
Fetches application statistics including counts and metrics.

**Returns:**
- `data: ApplicationStats` - Statistics object with counts and metrics
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state

#### `useAllApplications(params?)`
Fetches all applications with optional status filtering.

**Parameters:**
- `params.status?: 'Draft' | 'Submitted' | 'Approved' | 'Rejected'` - Filter by status

### Action Hooks (`use-application-actions.ts`)

#### `useRejectApplication()`
Hook for rejecting submitted applications.

**Usage:**
```tsx
const rejectMutation = useRejectApplication();

const handleReject = async (applicationId: string, reason: string) => {
  try {
    await rejectMutation.mutateAsync({ 
      applicationId, 
      payload: { reason } 
    });
    // Success
  } catch (error) {
    // Handle error
  }
};
```

#### `useApproveApplication()`
Hook for approving submitted applications.

**Usage:**
```tsx
const approveMutation = useApproveApplication();

const handleApprove = async (applicationId: string, payload: ApproveApplicationPayload) => {
  try {
    await approveMutation.mutateAsync({ applicationId, payload });
    // Success
  } catch (error) {
    // Handle error
  }
};
```

#### `useSubmitApplication()`
Hook for submitting draft applications.

**Usage:**
```tsx
const submitMutation = useSubmitApplication();

const handleSubmit = async (applicationId: string) => {
  try {
    await submitMutation.mutateAsync(applicationId);
    // Success
  } catch (error) {
    // Handle error
  }
};
```

#### `useBulkApplicationActions()`
Hook for bulk operations on multiple applications.

**Usage:**
```tsx
const { bulkReject, bulkApprove } = useBulkApplicationActions();

const handleBulkReject = async (applicationIds: string[], reason: string) => {
  try {
    const result = await bulkReject.mutateAsync({ applicationIds, reason });
    console.log(`Successfully rejected ${result.successful} applications`);
  } catch (error) {
    // Handle error
  }
};
```

### Management Hook (`use-applications-management.ts`)

#### `useApplicationsManagement()`
Comprehensive hook that combines all functionality for easy use in components.

**Returns:**
- **Data:** `applications`, `stats`
- **Loading states:** `isLoading`, `isError`, `error`
- **Current state:** `currentView`, `searchQuery`, `currentPage`, `pageSize`
- **Pagination:** `pagination` object with pagination utilities
- **Handlers:** `handleSearch`, `handleViewChange`, `handleRejectApplication`, etc.

**Example:**
```tsx
function ApplicationsPage() {
  const {
    applications,
    stats,
    isLoading,
    currentView,
    searchQuery,
    pagination,
    handleSearch,
    handleViewChange,
    handleRejectApplication,
    handleApproveApplication,
  } = useApplicationsManagement();

  return (
    <div>
      {/* Search input */}
      <input
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search applications..."
      />

      {/* View tabs */}
      <div>
        <button onClick={() => handleViewChange('drafts')}>Drafts</button>
        <button onClick={() => handleViewChange('submitted')}>Submitted</button>
        <button onClick={() => handleViewChange('approved')}>Approved</button>
      </div>

      {/* Applications list */}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {applications.map(app => (
            <div key={app.id}>
              <h3>{app.clientName}</h3>
              <p>{app.clientEmail}</p>
              <Badge>{app.status}</Badge>
              
              {app.status === 'Submitted' && (
                <div>
                  <button onClick={() => handleRejectApplication(app.id, 'Reason')}>
                    Reject
                  </button>
                  <button onClick={() => handleApproveApplication(app.id, {
                    tuitionFeeSnapshot: 5000,
                    agentCommissionRateSnapshot: 15,
                    action: 'Approved',
                    notes: 'Approved by admin'
                  })}>
                    Approve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div>
        <button 
          onClick={() => pagination.handlePageChange(pagination.currentPage - 1)}
          disabled={!pagination.hasPrevious}
        >
          Previous
        </button>
        <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
        <button 
          onClick={() => pagination.handlePageChange(pagination.currentPage + 1)}
          disabled={!pagination.hasNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

## Type Definitions

### `ApplicationSummary`
```typescript
interface ApplicationSummary {
  id: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  clientName: string;
  clientEmail: string;
  programName: string | null;
  agentName: string | null;
  createdAt: string;
  updatedAt: string;
  createdClientId: string | null;
  createdEnrolmentId: string | null;
}
```

### `ApplicationListResponse`
```typescript
interface ApplicationListResponse {
  data: ApplicationSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

### `ApplicationStats`
```typescript
interface ApplicationStats {
  totalApplications: number;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
  recentSubmissions: number;
  averageProcessingTime: number;
  completionRate: number;
}
```

### `RejectApplicationPayload`
```typescript
interface RejectApplicationPayload {
  reason: string;
}
```

### `ApproveApplicationPayload`
```typescript
interface ApproveApplicationPayload {
  tuitionFeeSnapshot: number;
  agentCommissionRateSnapshot: number;
  action?: string;
  notes?: string;
}
```

## Error Handling

All hooks include proper error handling and loading states:

```tsx
const { data, isLoading, isError, error } = useDraftApplications();

if (isError) {
  return <div>Error: {error?.message}</div>;
}

if (isLoading) {
  return <div>Loading...</div>;
}

return <div>{/* Your content */}</div>;
```

## Caching and Invalidation

The hooks use React Query for caching and automatic invalidation. Data is automatically refreshed when:

- Applications are created, updated, or deleted
- Status changes occur (draft → submitted → approved)
- Manual refresh is triggered

## Performance Considerations

- **Stale time:** Data is considered fresh for 30 seconds (list queries) or 1 minute (stats)
- **Refetch on window focus:** Disabled to prevent unnecessary requests
- **Pagination:** Built-in pagination support with configurable page sizes
- **Search debouncing:** Implement search debouncing in your components for better performance

## Examples

See `use-applications-example.tsx` for a complete example component demonstrating all functionality.

## Dependencies

- `@tanstack/react-query` - For data fetching and caching
- `@/lib/utils` - For API headers and utilities
- `@/src/types/api` - For TypeScript type definitions
