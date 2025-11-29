# Master Filter System Documentation

## Overview

The Master Filter System is a universal, AST-based query builder that replaces entity-specific filter implementations with a single, maintainable, performant solution. It supports complex nested AND/OR queries across all database entities.

### Key Features

- **Universal**: Single codebase for all filtering (students, applications, invoices, etc.)
- **Flexible**: Support for arbitrary nested AND/OR queries
- **Type-Safe**: Full TypeScript support with validation
- **Performant**: Dynamic query optimization with minimal joins
- **User-Friendly**: Intuitive UI for building complex filters

## Architecture

The system is built on a 4-layer architecture:

1. **Filter State (AST)** - Recursive JSON structure for AND/OR groups and rules
2. **Domain Map (Config)** - Type-safe mapping of business concepts to database paths
3. **Query Compiler (Engine)** - Converts AST + Domain Map into Supabase PostgREST queries
4. **UI Components** - Reusable query builder interface using ShadCN components

```
┌─────────────────┐
│   UI Layer      │  QueryBuilder, FilterRule, FilterGroup
├─────────────────┤
│   State Layer   │  useFilterState (URL sync, AST management)
├─────────────────┤
│   Compiler      │  buildSupabaseQuery (AST → PostgREST)
├─────────────────┤
│   Domain Map    │  FILTER_FIELDS (Field definitions)
└─────────────────┘
```

## Core Concepts

### Filter AST (Abstract Syntax Tree)

The filter AST is a recursive structure that represents user-defined filters:

```typescript
type FilterAST = FilterGroup;

interface FilterGroup {
  id: string;
  combinator: 'and' | 'or';
  rules: (FilterRule | FilterGroup)[];
}

interface FilterRule {
  id: string;
  fieldId: string;  // References domain map
  operator: Operator;
  value: any;
}
```

**Example AST:**
```json
{
  "id": "root-1",
  "combinator": "and",
  "rules": [
    {
      "id": "rule-1",
      "fieldId": "student_status",
      "operator": "eq",
      "value": "ACTIVE"
    },
    {
      "id": "group-1",
      "combinator": "or",
      "rules": [
        {
          "id": "rule-2",
          "fieldId": "agent_name",
          "operator": "contains",
          "value": "Global"
        },
        {
          "id": "rule-3",
          "fieldId": "program_code",
          "operator": "eq",
          "value": "BSB50420"
        }
      ]
    }
  ]
}
```

This represents: `student_status = 'ACTIVE' AND (agent_name contains 'Global' OR program_code = 'BSB50420')`

### Domain Map

The Domain Map (`src/lib/filters/domain-map.ts`) maps business-friendly field IDs to database paths:

```typescript
export const FILTER_FIELDS: DomainMap = {
  student_status: {
    label: "Student Status",
    type: "enum",
    dbPath: "status",
    rootTable: "students",
    operators: ['eq', 'neq', 'in', 'notIn'],
    options: ['ACTIVE', 'INACTIVE', 'COMPLETED', 'WITHDRAWN']
  },
  agent_name: {
    label: "Agent Name",
    type: "text",
    dbPath: "applications.agents.name",
    relationPath: ["applications", "agents"],
    rootTable: "students",
    operators: ['eq', 'neq', 'contains', 'startsWith', 'endsWith']
  }
  // ... more fields
};
```

### Operators

Supported operators vary by field type:

| Operator | Description | Supported Types |
|----------|-------------|-----------------|
| `eq` | Equals | All |
| `neq` | Not equals | All |
| `gt` | Greater than | number, date |
| `gte` | Greater than or equal | number, date |
| `lt` | Less than | number, date |
| `lte` | Less than or equal | number, date |
| `contains` | Case-insensitive contains | text |
| `startsWith` | Starts with | text |
| `endsWith` | Ends with | text |
| `in` | Value in array | number, enum |
| `notIn` | Value not in array | number, enum |
| `isNull` | Field is null | All |
| `isNotNull` | Field is not null | All |

## Usage Guide

### Basic Usage

#### 1. Using the QueryBuilder Component

```tsx
import { QueryBuilder } from '@/components/filters/QueryBuilder';

function StudentsPage() {
  return (
    <div>
      <QueryBuilder 
        rootTable="students"
        maxDepth={3}
        title="Filter Students"
      />
    </div>
  );
}
```

#### 2. Using useMasterFilter Hook

```tsx
import { useMasterFilter } from '@/hooks/useMasterFilter';
import { useFilterState } from '@/hooks/useFilterState';
import { QueryBuilder } from '@/components/filters/QueryBuilder';

function StudentsPage() {
  const { ast } = useFilterState();
  const { data, isLoading, error } = useMasterFilter({
    rootTable: 'students',
    ast: ast.rules.length > 0 ? ast : undefined,
    includeCount: true,
  });
  
  return (
    <div>
      <QueryBuilder rootTable="students" />
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && (
        <ul>
          {data.map((student) => (
            <li key={student.id}>{student.first_name} {student.last_name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

#### 3. Programmatic Filter Creation

```tsx
import { useFilterState } from '@/hooks/useFilterState';
import { getFieldDefinition, FILTER_FIELDS } from '@/lib/filters/domain-map';

function MyComponent() {
  const { addRule, addGroup, updateAST } = useFilterState();
  
  const handleQuickFilter = () => {
    // Add a rule for active students
    addRule('root-group-id', {
      fieldId: 'student_status',
      operator: 'eq',
      value: 'ACTIVE',
    });
  };
  
  const handleComplexFilter = () => {
    // Create a complex filter programmatically
    const ast = {
      id: 'root-1',
      combinator: 'and' as const,
      rules: [
        {
          id: 'rule-1',
          fieldId: 'student_status',
          operator: 'eq' as const,
          value: 'ACTIVE',
        },
        {
          id: 'group-1',
          combinator: 'or' as const,
          rules: [
            {
              id: 'rule-2',
              fieldId: 'agent_name',
              operator: 'contains' as const,
              value: 'Global',
            },
          ],
        },
      ],
    };
    updateAST(ast);
  };
  
  return (
    <div>
      <button onClick={handleQuickFilter}>Filter Active Students</button>
      <button onClick={handleComplexFilter}>Apply Complex Filter</button>
    </div>
  );
}
```

### Advanced Usage

#### Custom Select Fields

```tsx
const { data } = useMasterFilter({
  rootTable: 'students',
  ast,
  additionalSelectFields: [
    'enrollments!inner(id, status)',
    'applications!inner(id, status)',
  ],
});
```

#### URL Synchronization

The `useFilterState` hook automatically syncs filter state with URL parameters:

```
?filters=eyJpZCI6InJvb3QtMSIsImNvbWJpbmF0b3IiOiJhbmQiLCJydWxlcyI6W3siaWQiOiJydWxlLTEiLCJmaWVsZElkIjoic3R1ZGVudF9zdGF0dXMiLCJvcGVyYXRvciI6ImVxIiwidmFsdWUiOiJBQ1RJVkUifV19
```

The filter AST is base64-encoded in the URL for shareability.

#### Validation

```tsx
import { validateAST, isValidAST } from '@/lib/filters/validation';

const errors = validateAST(ast, maxDepth: 3);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
}

if (isValidAST(ast)) {
  // Safe to use
}
```

## API Reference

### Hooks

#### `useFilterState(options?)`

Manages filter AST state with URL synchronization.

**Options:**
- `paramName?: string` - URL parameter name (default: 'filters')
- `persistToLocalStorage?: boolean` - Persist to localStorage (default: false)
- `localStorageKey?: string` - localStorage key

**Returns:**
```typescript
{
  ast: FilterAST;
  updateAST: (ast: FilterAST) => void;
  resetFilter: () => void;
  addRule: (groupId: string, rule: Omit<FilterRule, 'id'>) => void;
  removeRule: (ruleId: string) => void;
  updateRule: (ruleId: string, updates: Partial<FilterRule>) => void;
  addGroup: (parentGroupId: string, combinator?: 'and' | 'or') => void;
  removeGroup: (groupId: string) => void;
  updateGroupCombinator: (groupId: string, combinator: 'and' | 'or') => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}
```

#### `useMasterFilter(options)`

Generic hook for fetching data with filter AST support.

**Options:**
```typescript
{
  rootTable: string;
  ast?: FilterAST;
  selectFields?: string[];
  includeCount?: boolean;
  maxDepth?: number;
  additionalSelectFields?: string[];
  queryOptions?: UseQueryOptions;
}
```

**Returns:** TanStack Query result with filtered data.

### Components

#### `<QueryBuilder />`

Main query builder component.

**Props:**
```typescript
{
  rootTable: string;
  initialAST?: FilterAST;
  onFiltersChange?: (ast: FilterAST) => void;
  maxDepth?: number;
  disabled?: boolean;
  title?: string;
}
```

#### `<FilterRuleComponent />`

Individual rule component (used internally by QueryBuilder).

#### `<FilterGroupComponent />`

Group container component (used internally by QueryBuilder).

#### `<FieldInput />`

Type-specific input component (used internally by FilterRule).

### Utilities

#### `buildSupabaseQuery(supabase, ast, options)`

Compiles filter AST into a Supabase query.

#### `validateAST(ast, maxDepth?)`

Validates filter AST structure and returns validation errors.

#### `analyzeRequiredRelations(ast, rootTable)`

Analyzes AST to determine which relations need to be joined.

#### `getFieldsForTable(rootTable)`

Gets all field definitions for a specific root table.

#### `getFieldDefinition(fieldId)`

Gets field definition by field ID.

## Domain Map Configuration

### Adding New Fields

To add a new filterable field, update `src/lib/filters/domain-map.ts`:

```typescript
export const FILTER_FIELDS: DomainMap = {
  // ... existing fields
  
  my_new_field: {
    label: "My New Field",
    type: "text", // or 'number', 'date', 'boolean', 'enum'
    dbPath: "my_field", // or "relations.table.field" for nested
    rootTable: "students", // or 'applications', 'invoices', etc.
    operators: ['eq', 'neq', 'contains'], // based on type
    relationPath: [], // if accessing relations: ['applications', 'agents']
    options: undefined, // for enum fields: ['OPTION1', 'OPTION2']
    nullable: false, // whether field can be null
  },
};
```

### Field Types

- **text**: String fields (name, email, etc.)
- **number**: Numeric fields (amount, count, etc.)
- **date**: Date fields (created_at, due_date, etc.)
- **boolean**: Boolean fields (is_active, etc.)
- **enum**: Enum fields with predefined options (status, type, etc.)

### Relation Paths

For fields that require joins:

```typescript
agent_name: {
  label: "Agent Name",
  type: "text",
  dbPath: "applications.agents.name",
  relationPath: ["applications", "agents"], // Required relations
  rootTable: "students",
  operators: textOperators,
}
```

The query compiler will automatically:
- Add `!inner` joins when filtering on relations
- Build the correct select string
- Optimize queries to only join needed relations

## Query Compilation

### How It Works

1. **Analyze AST**: Determine required relations
2. **Build Select**: Generate minimal select string with only needed joins
3. **Compile Filters**: Convert AST rules to PostgREST filter strings
4. **Apply to Query**: Execute optimized Supabase query

### PostgREST Filter String Syntax

The compiler generates PostgREST filter strings:

```
// Simple AND
and(field1.eq.value1,field2.eq.value2)

// Simple OR
field1.eq.value1,field2.eq.value2

// Nested
and(field1.eq.value1,or(field2.eq.value2,field3.eq.value3))
```

### Dynamic Select Generation

The compiler analyzes the AST to determine which relations are needed:

```typescript
// If filtering by agent_name, only join applications and agents
// If filtering by program_name, only join enrollments and programs
// Never joins relations that aren't used in filters
```

## Performance Optimization

### Database Indexes

The migration `20251129052316_add_filter_performance_indexes.sql` adds indexes on:

- Status fields (very common filters)
- Display IDs (common for search)
- Name fields (common for search)
- Date fields (common for range queries)
- Foreign keys (for joins)
- Composite indexes (for multi-column filters)

### Query Optimization Strategies

1. **Dynamic Selects**: Only select and join what's needed
2. **Inner Joins**: Use `!inner` only when filtering on relations
3. **Index Usage**: All commonly filtered columns are indexed
4. **Minimal Joins**: Relations are only joined if used in filters

### Best Practices

1. **Limit Nesting Depth**: Default max depth is 3 levels
2. **Use Specific Fields**: Prefer specific field filters over broad searches
3. **Index Coverage**: Ensure filtered columns have indexes
4. **Monitor Performance**: Use Supabase dashboard to monitor query performance

## Migration Guide

### Migrating Existing Filters

#### Step 1: Update Data Fetching Hook

**Before:**
```typescript
export const useGetStudents = (filters?: StudentFilters) => {
  return useQuery({
    queryKey: ['students', filters],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase.from('students').select('*');
      
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%`);
      }
      // ... more filters
      
      const { data, error } = await query;
      return data ?? [];
    },
  });
};
```

**After:**
```typescript
import { useMasterFilter } from '@/hooks/useMasterFilter';
import { useFilterState } from '@/hooks/useFilterState';

export const useGetStudents = () => {
  const { ast } = useFilterState({ paramName: 'studentFilters' });
  
  return useMasterFilter({
    rootTable: 'students',
    ast: ast.rules.length > 0 ? ast : undefined,
  });
};
```

#### Step 2: Update UI Component

**Before:**
```tsx
<StudentsFilter 
  filters={filters}
  onApply={handleApply}
  onReset={handleReset}
/>
```

**After:**
```tsx
<QueryBuilder 
  rootTable="students"
  title="Filter Students"
/>
```

#### Step 3: Remove Old Code

After successful migration:
- Remove old filter hook (`useStudentsFilters.ts`)
- Remove old filter UI component (`StudentsFilter.tsx`)
- Update any remaining references

### Migration Checklist

- [ ] Update data fetching hook to use `useMasterFilter`
- [ ] Replace filter UI with `QueryBuilder`
- [ ] Test all existing filter combinations
- [ ] Verify URL synchronization works
- [ ] Check query performance
- [ ] Remove old filter code
- [ ] Update documentation

## Troubleshooting

### Common Issues

#### 1. "Field not found in domain map"

**Problem**: Field ID doesn't exist in `FILTER_FIELDS`.

**Solution**: Add the field to `src/lib/filters/domain-map.ts`.

#### 2. "Operator not allowed for field type"

**Problem**: Trying to use an operator that's not supported for the field type.

**Solution**: Check the field definition's `operators` array and use a supported operator.

#### 3. "Maximum nesting depth exceeded"

**Problem**: Filter AST exceeds maximum nesting depth (default: 3).

**Solution**: Reduce nesting or increase `maxDepth` in `useFilterState` options.

#### 4. "Query performance is slow"

**Problem**: Query is joining too many relations or missing indexes.

**Solution**:
- Check that only needed relations are joined (compiler should handle this)
- Verify indexes exist on filtered columns
- Consider using materialized views for complex queries

#### 5. "URL parameter too long"

**Problem**: Filter AST is too large for URL parameter.

**Solution**: The system uses base64 encoding and sessionStorage fallback for large ASTs.

### Debugging

#### Enable Query Logging

```typescript
const { data } = useMasterFilter({
  rootTable: 'students',
  ast,
  queryOptions: {
    onSuccess: (data) => {
      console.log('Query successful:', data);
    },
    onError: (error) => {
      console.error('Query error:', error);
    },
  },
});
```

#### Validate AST

```typescript
import { validateAST, getValidationSummary } from '@/lib/filters/validation';

const errors = validateAST(ast);
if (errors.length > 0) {
  console.error(getValidationSummary(errors));
}
```

#### Inspect Compiled Query

```typescript
import { analyzeRequiredRelations, buildSelectString } from '@/lib/filters/query-compiler';

const relations = analyzeRequiredRelations(ast, 'students');
const select = buildSelectString('students', relations);
console.log('Select string:', select);
```

## Examples

### Example 1: Simple Status Filter

```tsx
function StudentsPage() {
  const { ast, addRule } = useFilterState();
  
  useEffect(() => {
    // Add active students filter
    addRule(ast.id, {
      fieldId: 'student_status',
      operator: 'eq',
      value: 'ACTIVE',
    });
  }, []);
  
  const { data } = useMasterFilter({
    rootTable: 'students',
    ast,
  });
  
  return <div>{/* Render students */}</div>;
}
```

### Example 2: Complex Nested Filter

```tsx
function ApplicationsPage() {
  const { ast, updateAST } = useFilterState();
  
  const handleComplexFilter = () => {
    updateAST({
      id: 'root',
      combinator: 'and',
      rules: [
        {
          id: 'rule-1',
          fieldId: 'application_status',
          operator: 'in',
          value: ['SUBMITTED', 'OFFER_GENERATED'],
        },
        {
          id: 'group-1',
          combinator: 'or',
          rules: [
            {
              id: 'rule-2',
              fieldId: 'application_agent_name',
              operator: 'contains',
              value: 'Global',
            },
            {
              id: 'rule-3',
              fieldId: 'application_program_code',
              operator: 'eq',
              value: 'BSB50420',
            },
          ],
        },
      ],
    });
  };
  
  return (
    <div>
      <button onClick={handleComplexFilter}>Apply Complex Filter</button>
      <QueryBuilder rootTable="applications" />
    </div>
  );
}
```

### Example 3: Date Range Filter

```tsx
function InvoicesPage() {
  const { ast, addRule } = useFilterState();
  
  const handleDateRange = (from: Date, to: Date) => {
    // Clear existing date filters
    const newRules = ast.rules.filter(
      (r) => !('fieldId' in r && r.fieldId === 'invoice_due_date')
    );
    
    // Add new date range filters
    updateAST({
      ...ast,
      rules: [
        ...newRules,
        {
          id: 'rule-from',
          fieldId: 'invoice_due_date',
          operator: 'gte',
          value: from.toISOString(),
        },
        {
          id: 'rule-to',
          fieldId: 'invoice_due_date',
          operator: 'lte',
          value: to.toISOString(),
        },
      ],
    });
  };
  
  return <QueryBuilder rootTable="invoices" />;
}
```

## Best Practices

1. **Use TypeScript**: Leverage full type safety with `FilterAST`, `FilterRule`, etc.
2. **Validate Before Use**: Always validate AST before passing to `useMasterFilter`
3. **Limit Nesting**: Keep nesting depth reasonable (3 levels max)
4. **Index Coverage**: Ensure all filtered columns have database indexes
5. **Test Queries**: Test complex filter combinations before deploying
6. **Monitor Performance**: Use Supabase dashboard to monitor query performance
7. **URL Sync**: Leverage URL synchronization for shareable filter links
8. **Error Handling**: Always handle errors from `useMasterFilter`

## Future Enhancements

Potential improvements for the system:

1. **Materialized Views**: For extremely complex cross-entity queries
2. **Filter Presets**: Save and load common filter combinations
3. **Export/Import**: Export filter ASTs for sharing
4. **Query Builder UI Enhancements**: Drag-and-drop, visual query builder
5. **Performance Monitoring**: Built-in query performance tracking
6. **Filter Suggestions**: AI-powered filter suggestions based on data patterns

## Support

For issues or questions:
1. Check this documentation
2. Review the code in `src/lib/filters/`
3. Check validation errors with `validateAST()`
4. Inspect compiled queries in browser DevTools

## License

Part of the XPortal project.


