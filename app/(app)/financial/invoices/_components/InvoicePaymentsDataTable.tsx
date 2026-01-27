'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import {
  DataTable,
  type DataTableColumnDef,
  type DataTableRef,
} from '@/components/data-table';
import { convertColumnDefs } from '@/components/data-table/migration-utils';
import {
  getInvoicePaymentsTableKey,
  useGetTablePreferences,
} from '@/src/hooks/useTablePreferences';
import type { InvoiceType } from '@/src/hooks/useGetInvoicePayments';
import {
  useGetInvoicePayments,
  type InvoicePaymentRow,
} from '@/src/hooks/useGetInvoicePayments';
import {
  DEFAULT_VISIBLE_COLUMNS,
  getPaymentsColumns,
  type ColumnDef as OldColumnDef,
} from './paymentsTableColumns';

export type InvoicePaymentsDataTableRef = {
  getRows: () => InvoicePaymentRow[];
};

type Props = {
  invoiceId?: string;
  invoiceType?: InvoiceType;
};

export const InvoicePaymentsDataTable = forwardRef<
  InvoicePaymentsDataTableRef,
  Props
>(function InvoicePaymentsDataTable({ invoiceId, invoiceType }, ref) {
  const { data, isLoading, isError, error } = useGetInvoicePayments({
    invoiceId,
    invoiceType,
  });

  const tableKey = getInvoicePaymentsTableKey();
  const { data: prefs } = useGetTablePreferences(tableKey);

  const tableRef = useRef<DataTableRef<InvoicePaymentRow>>(null);

  const oldColumns: OldColumnDef[] = getPaymentsColumns();
  const columns: DataTableColumnDef<InvoicePaymentRow>[] = useMemo(
    () => convertColumnDefs<InvoicePaymentRow>(oldColumns),
    [oldColumns]
  );

  useImperativeHandle(
    ref,
    () => ({
      getRows: () => tableRef.current?.getRows() ?? [],
    }),
    []
  );

  const resolvedError = isError
    ? error instanceof Error
      ? error
      : new Error('Failed to load payments')
    : null;

  return (
    <DataTable<InvoicePaymentRow>
      ref={tableRef}
      data={(data ?? []) as InvoicePaymentRow[]}
      columns={columns}
      isLoading={isLoading}
      error={resolvedError}
      enableSorting
      enableFiltering
      enableColumnResizing
      enableColumnReordering
      enableExport
      enablePagination
      enableGlobalSearch
      defaultVisibleColumns={
        prefs?.visible_columns?.length
          ? prefs.visible_columns
          : DEFAULT_VISIBLE_COLUMNS
      }
      defaultPageSize={10}
      tableKey={tableKey}
    />
  );
});
