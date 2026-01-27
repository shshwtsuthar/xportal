import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useGetTablePreferences,
  useUpsertTablePreferences,
  type TablePreferences,
} from '@/src/hooks/useTablePreferences';
import type { DataTableColumnDef } from '../types';

type UseColumnPreferencesOptions<T> = {
  tableKey?: string;
  columns: DataTableColumnDef<T>[];
  defaultVisibleColumns?: string[];
};

export const useColumnPreferences = <T>({
  tableKey,
  columns,
  defaultVisibleColumns = [],
}: UseColumnPreferencesOptions<T>) => {
  const { data: prefs } = useGetTablePreferences(tableKey || '');
  const upsertPrefs = useUpsertTablePreferences();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize from preferences or defaults
  useEffect(() => {
    if (!prefs && !tableKey) {
      // No preferences system, use defaults
      const defaultCols =
        defaultVisibleColumns.length > 0
          ? defaultVisibleColumns
          : columns.map((c) => c.id);
      setVisibleColumns(defaultCols);
      return;
    }

    if (!prefs) return;

    const defaults =
      defaultVisibleColumns.length > 0
        ? defaultVisibleColumns
        : columns.map((c) => c.id);
    const hasPrefs = prefs.visible_columns.length > 0;
    const nextVisible = hasPrefs ? prefs.visible_columns : defaults;
    setVisibleColumns(nextVisible);
    setColumnWidths(prefs.column_widths || {});

    // Persist defaults once if there are no stored preferences
    // Use upsertPrefs directly here since we're initializing, not updating
    if (!hasPrefs && tableKey) {
      upsertPrefs.mutate({
        tableKey,
        visible_columns: defaults,
        column_widths: {},
      });
    }
  }, [prefs, columns, defaultVisibleColumns, tableKey, upsertPrefs]);

  const persistPrefs = useCallback(
    (next: Partial<TablePreferences>) => {
      if (!tableKey) return;

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        upsertPrefs.mutate({
          tableKey,
          visible_columns: next.visible_columns ?? visibleColumns,
          column_widths: next.column_widths ?? columnWidths,
        });
      }, 300);
    },
    [tableKey, visibleColumns, columnWidths, upsertPrefs]
  );

  const toggleColumnVisibility = useCallback(
    (columnId: string) => {
      const next = visibleColumns.includes(columnId)
        ? visibleColumns.filter((id) => id !== columnId)
        : [...visibleColumns, columnId];
      setVisibleColumns(next);
      persistPrefs({ visible_columns: next });
    },
    [visibleColumns, persistPrefs]
  );

  const setColumnWidth = useCallback(
    (columnId: string, width: number) => {
      const column = columns.find((c) => c.id === columnId);
      if (!column) return;

      const minWidth = column.minWidth ?? 100;
      const maxWidth = column.maxWidth ?? 600;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width));

      const updated = { ...columnWidths, [columnId]: clampedWidth };
      setColumnWidths(updated);
      persistPrefs({ column_widths: updated });
    },
    [columns, columnWidths, persistPrefs]
  );

  const resetToDefaults = useCallback(() => {
    const defaults =
      defaultVisibleColumns.length > 0
        ? defaultVisibleColumns
        : columns.map((c) => c.id);
    setVisibleColumns(defaults);
    setColumnWidths({});
    persistPrefs({ visible_columns: defaults, column_widths: {} });
  }, [columns, defaultVisibleColumns, persistPrefs]);

  return {
    visibleColumns,
    columnWidths,
    setVisibleColumns,
    setColumnWidths,
    toggleColumnVisibility,
    setColumnWidth,
    resetToDefaults,
  };
};
