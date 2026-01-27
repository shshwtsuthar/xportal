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
  const [columnOrder, setColumnOrder] = useState<string[] | undefined>(
    undefined
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const columnsIdsRef = useRef<string>('');
  const defaultVisibleColumnsRef = useRef<string>('');
  const lastPrefsKeyRef = useRef<string>('');
  const defaultsPersistedRef = useRef(false);
  const upsertPrefsRef = useRef(upsertPrefs);

  // Keep ref updated
  useEffect(() => {
    upsertPrefsRef.current = upsertPrefs;
  }, [upsertPrefs]);

  // Memoize column IDs and default visible columns strings for comparison
  const currentColumnsIds = columns.map((c) => c.id).join(',');
  const currentDefaultVisibleColumns = defaultVisibleColumns.join(',');

  // Create a stable key for prefs to detect actual changes
  const prefsKey = prefs
    ? `${JSON.stringify(prefs.visible_columns)}|${JSON.stringify(prefs.column_widths)}|${JSON.stringify(prefs.column_order)}`
    : '';

  // Initialize from preferences or defaults
  useEffect(() => {
    // Only initialize once or when columns/defaults/prefs actually change
    const columnsChanged = columnsIdsRef.current !== currentColumnsIds;
    const defaultsChanged =
      defaultVisibleColumnsRef.current !== currentDefaultVisibleColumns;
    const prefsChanged = lastPrefsKeyRef.current !== prefsKey;

    if (
      !initializedRef.current ||
      columnsChanged ||
      defaultsChanged ||
      (prefsChanged && prefs)
    ) {
      columnsIdsRef.current = currentColumnsIds;
      defaultVisibleColumnsRef.current = currentDefaultVisibleColumns;
      if (prefs) {
        lastPrefsKeyRef.current = prefsKey;
      }

      if (!prefs && !tableKey) {
        // No preferences system, use defaults
        const defaultCols =
          defaultVisibleColumns.length > 0
            ? defaultVisibleColumns
            : columns.map((c) => c.id);
        setVisibleColumns(defaultCols);
        initializedRef.current = true;
        return;
      }

      if (!prefs) {
        // Still loading preferences
        return;
      }

      const defaults =
        defaultVisibleColumns.length > 0
          ? defaultVisibleColumns
          : columns.map((c) => c.id);
      const hasPrefs = prefs.visible_columns.length > 0;
      const nextVisible = hasPrefs ? prefs.visible_columns : defaults;

      // Only update if values actually changed
      setVisibleColumns((prev) => {
        if (
          prev.length === nextVisible.length &&
          prev.every((id, i) => id === nextVisible[i])
        ) {
          return prev;
        }
        return nextVisible;
      });

      setColumnWidths((prev) => {
        const next = prefs.column_widths || {};
        if (JSON.stringify(prev) === JSON.stringify(next)) {
          return prev;
        }
        return next;
      });

      setColumnOrder((prev) => {
        const next = prefs.column_order;
        if (prev === next) {
          return prev;
        }
        if (
          prev &&
          next &&
          prev.length === next.length &&
          prev.every((id, i) => id === next[i])
        ) {
          return prev;
        }
        return next;
      });

      // Persist defaults once if there are no stored preferences
      // Use upsertPrefs directly here since we're initializing, not updating
      if (!hasPrefs && tableKey && !defaultsPersistedRef.current) {
        defaultsPersistedRef.current = true;
        // Use setTimeout to avoid triggering during render
        setTimeout(() => {
          upsertPrefsRef.current.mutate({
            tableKey,
            visible_columns: defaults,
            column_widths: {},
            column_order: undefined,
          });
        }, 0);
      }

      initializedRef.current = true;
    }
  }, [
    prefs,
    prefsKey,
    currentColumnsIds,
    currentDefaultVisibleColumns,
    defaultVisibleColumns,
    columns,
    tableKey,
  ]);

  const persistPrefs = useCallback(
    (next: Partial<TablePreferences>) => {
      if (!tableKey) return;

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        upsertPrefs.mutate({
          tableKey,
          visible_columns: next.visible_columns ?? visibleColumns,
          column_widths: next.column_widths ?? columnWidths,
          column_order: next.column_order ?? columnOrder,
        });
      }, 300);
    },
    [tableKey, visibleColumns, columnWidths, columnOrder, upsertPrefs]
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

  const setColumnOrderFn = useCallback(
    (order: string[]) => {
      setColumnOrder(order);
      persistPrefs({ column_order: order });
    },
    [persistPrefs]
  );

  const resetToDefaults = useCallback(() => {
    const defaults =
      defaultVisibleColumns.length > 0
        ? defaultVisibleColumns
        : columns.map((c) => c.id);
    setVisibleColumns(defaults);
    setColumnWidths({});
    setColumnOrder(undefined);
    persistPrefs({
      visible_columns: defaults,
      column_widths: {},
      column_order: undefined,
    });
  }, [columns, defaultVisibleColumns, persistPrefs]);

  return {
    visibleColumns,
    columnWidths,
    columnOrder,
    setVisibleColumns,
    setColumnWidths,
    setColumnOrder: setColumnOrderFn,
    toggleColumnVisibility,
    setColumnWidth,
    resetToDefaults,
  };
};
