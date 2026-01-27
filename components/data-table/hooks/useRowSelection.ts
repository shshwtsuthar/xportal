import { useState, useCallback, useMemo } from 'react';
import type { Row, RowSelectionState } from '@tanstack/react-table';
import type { RowSelectionMode } from '../types';

type UseRowSelectionOptions<T> = {
  rows: Row<T>[];
  mode: RowSelectionMode;
  onRowSelect?: (selectedRows: T[]) => void;
};

export const useRowSelection = <T>({
  rows,
  mode,
  onRowSelect,
}: UseRowSelectionOptions<T>) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const selectedRows = useMemo(() => {
    return rows
      .filter((row) => rowSelection[row.id])
      .map((row) => row.original);
  }, [rows, rowSelection]);

  const handleRowSelectionChange = useCallback(
    (
      updater:
        | RowSelectionState
        | ((prev: RowSelectionState) => RowSelectionState)
    ) => {
      const newSelection =
        typeof updater === 'function' ? updater(rowSelection) : updater;

      // Enforce single selection mode
      if (mode === 'single') {
        const selectedIds = Object.keys(newSelection).filter(
          (id) => newSelection[id]
        );
        if (selectedIds.length > 1) {
          // Keep only the last selected
          const lastId = selectedIds[selectedIds.length - 1];
          const singleSelection: RowSelectionState = { [lastId]: true };
          setRowSelection(singleSelection);
          const selectedRow = rows.find((r) => r.id === lastId);
          onRowSelect?.(selectedRow ? [selectedRow.original] : []);
          return;
        }
      }

      setRowSelection(newSelection);
      const selected = rows
        .filter((row) => newSelection[row.id])
        .map((row) => row.original);
      onRowSelect?.(selected);
    },
    [rowSelection, rows, mode, onRowSelect]
  );

  const clearSelection = useCallback(() => {
    setRowSelection({});
    onRowSelect?.([]);
  }, [onRowSelect]);

  const isAllSelected = useMemo(() => {
    if (mode === 'none') return false;
    return rows.length > 0 && rows.every((row) => rowSelection[row.id]);
  }, [rows, rowSelection, mode]);

  const isSomeSelected = useMemo(() => {
    if (mode === 'none') return false;
    return rows.some((row) => rowSelection[row.id]) && !isAllSelected;
  }, [rows, rowSelection, isAllSelected, mode]);

  const toggleAllRows = useCallback(() => {
    if (isAllSelected) {
      clearSelection();
    } else {
      const allSelected: RowSelectionState = {};
      rows.forEach((row) => {
        allSelected[row.id] = true;
      });
      setRowSelection(allSelected);
      onRowSelect?.(rows.map((row) => row.original));
    }
  }, [isAllSelected, rows, clearSelection, onRowSelect]);

  return {
    rowSelection,
    setRowSelection: handleRowSelectionChange,
    selectedRows,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    toggleAllRows,
  };
};
