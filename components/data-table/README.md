# DataTable Component

A feature-rich, reusable DataTable component built with TanStack Table and ShadCN UI.

## Features

- ✅ Column sorting (single column)
- ✅ Column filtering (global search)
- ✅ Column resizing with persistence
- ✅ Column visibility management
- ✅ Row selection (single/multi)
- ✅ Row reordering (drag-and-drop)
- ✅ Pagination
- ✅ Export (CSV/XLSX)
- ✅ Loading states
- ✅ Empty/Error states
- ✅ Accessibility (ARIA labels, keyboard navigation)
- ✅ User preferences persistence

## Basic Usage

```tsx
import { DataTable, type DataTableColumnDef } from '@/components/data-table';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const columns: DataTableColumnDef<User>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorKey: 'name',
    enableSorting: true,
  },
  {
    id: 'email',
    header: 'Email',
    accessorKey: 'email',
  },
  {
    id: 'role',
    header: 'Role',
    accessorKey: 'role',
    cell: ({ row }) => <Badge>{row.original.role}</Badge>,
  },
];

function UsersTable() {
  const { data, isLoading } = useGetUsers();

  return (
    <DataTable
      data={data ?? []}
      columns={columns}
      isLoading={isLoading}
      tableKey="users.datatable"
      defaultVisibleColumns={['name', 'email', 'role']}
      enableRowSelection
      rowSelectionMode="multi"
      renderActions={(row) => (
        <Button onClick={() => editUser(row.id)}>Edit</Button>
      )}
    />
  );
}
```

## Migration from Old Format

Use the `convertColumnDef` utility to migrate existing column definitions:

```tsx
import { convertColumnDefs } from '@/components/data-table/migration-utils';

// Old format
const oldColumns = [
  {
    id: 'name',
    label: 'Name',
    width: 200,
    sortable: true,
    sortAccessor: (row) => row.name,
    render: (row) => row.name,
  },
];

// Convert to new format
const newColumns = convertColumnDefs(oldColumns);
```

## Advanced Features

### Row Selection

```tsx
<DataTable
  enableRowSelection
  rowSelectionMode="multi"
  onRowSelect={(selectedRows) => {
    console.log('Selected:', selectedRows);
  }}
/>
```

### Export

```tsx
const tableRef = useRef<DataTableRef<User>>(null);

<DataTable
  ref={tableRef}
  enableExport
  exportFormats={['csv', 'xlsx']}
/>

// Export programmatically
tableRef.current?.exportTable('csv');
```

### Custom Toolbar

```tsx
<DataTable
  renderToolbar={() => (
    <div className="flex items-center gap-2">
      <Button>Custom Action</Button>
      <DataTableColumnMenu
        columns={columns}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
      />
    </div>
  )}
/>
```

## API Reference

See `types.ts` for full TypeScript definitions.
