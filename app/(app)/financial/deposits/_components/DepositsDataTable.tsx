'use client';

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { RecordPaymentDialog } from '../../invoices/_components/RecordPaymentDialog';
import { useGetApplicationInvoices } from '@/src/hooks/useGetApplicationInvoices';
import {
  getDepositsTableKey,
  useGetTablePreferences,
} from '@/src/hooks/useTablePreferences';
import {
  DEFAULT_VISIBLE_COLUMNS,
  getDepositsColumns,
  type RowType,
} from './depositsTableColumns';
import {
  DataTable,
  type DataTableColumnDef,
  type DataTableRef,
} from '@/components/data-table';
import { convertColumnDefs } from '@/components/data-table/migration-utils';

export type DepositsDataTableRef = {
  getRows: () => RowType[];
  getSelectedRows: () => RowType[];
  exportTable: (format: 'csv' | 'xlsx') => Promise<void>;
};

type Props = { filters?: unknown };

export const DepositsDataTable = forwardRef<DepositsDataTableRef, Props>(
  function DepositsDataTable({ filters }: Props, ref) {
    const { data, isLoading, isError } = useGetApplicationInvoices(
      filters as Record<string, unknown> | undefined
    );

    const tableKey = getDepositsTableKey();
    const { data: prefs } = useGetTablePreferences(tableKey);

    const tableRef = useRef<DataTableRef<RowType>>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<RowType | null>(
      null
    );

    const oldColumns = getDepositsColumns();
    const columns: DataTableColumnDef<RowType>[] = useMemo(
      () => convertColumnDefs(oldColumns),
      [oldColumns]
    );

    useImperativeHandle(
      ref,
      () => ({
        getRows: () => tableRef.current?.getRows() ?? [],
        getSelectedRows: () => tableRef.current?.getSelectedRows() ?? [],
        exportTable: async (format: 'csv' | 'xlsx') =>
          tableRef.current?.exportTable(format),
      }),
      []
    );

    const handleOpenRecordPayment = (row: RowType) => {
      if (row.status === 'VOID') {
        return;
      }
      setSelectedInvoice(row);
    };

    const renderActions = (row: RowType) => {
      if (row.status === 'VOID') {
        return null;
      }

      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpenRecordPayment(row)}
          aria-label="Record payment"
        >
          Record Payment
        </Button>
      );
    };

    const error = isError ? new Error('Failed to load deposits') : null;

    return (
      <>
        <DataTable<RowType>
          ref={tableRef}
          data={(data ?? []) as RowType[]}
          columns={columns}
          isLoading={isLoading}
          error={error}
          enableSorting
          enableFiltering
          enableColumnResizing
          enableColumnReordering
          enableRowReordering
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
          renderActions={renderActions}
        />

        {selectedInvoice && (
          <RecordPaymentDialog
            invoiceId={selectedInvoice.id}
            invoiceType="APPLICATION"
            onClose={() => setSelectedInvoice(null)}
          />
        )}
      </>
    );
  }
);
