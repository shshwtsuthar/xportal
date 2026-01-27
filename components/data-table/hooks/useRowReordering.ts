import { useState, useCallback } from 'react';
import type { Row } from '@tanstack/react-table';

type UseRowReorderingOptions<T> = {
  rows: Row<T>[];
  onReorder?: (reorderedRows: T[]) => void;
};

export const useRowReordering = <T>({
  rows,
  onReorder,
}: UseRowReorderingOptions<T>) => {
  const [manualOrderIds, setManualOrderIds] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const isManualOrderActive =
    manualOrderIds !== null && manualOrderIds.length > 0;

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
  }, []);

  const handleDragEnter = useCallback((id: string) => {
    setDragOverId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!draggingId || !dragOverId || draggingId === dragOverId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const currentOrder = manualOrderIds ?? rows.map((r) => r.id);
    const fromIndex = currentOrder.indexOf(draggingId);
    const toIndex = currentOrder.indexOf(dragOverId);

    if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
      const newOrder = [...currentOrder];
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, removed);
      setManualOrderIds(newOrder);

      // Create reordered data array
      const reorderedRows: T[] = [];
      const rowMap = new Map(rows.map((r) => [r.id, r.original]));
      newOrder.forEach((id) => {
        const row = rowMap.get(id);
        if (row) {
          reorderedRows.push(row);
        }
      });
      onReorder?.(reorderedRows);
    }

    setDraggingId(null);
    setDragOverId(null);
  }, [draggingId, dragOverId, manualOrderIds, rows, onReorder]);

  const resetManualOrder = useCallback(() => {
    setManualOrderIds(null);
    // Reset to original order
    onReorder?.(rows.map((r) => r.original));
  }, [rows, onReorder]);

  // Get ordered rows based on manual order or original order
  const getOrderedRows = useCallback((): Row<T>[] => {
    if (!isManualOrderActive) {
      return rows;
    }

    const orderMap = new Map<string, number>();
    manualOrderIds!.forEach((id, index) => {
      orderMap.set(id, index);
    });

    return [...rows].sort((a, b) => {
      const aIndex = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  }, [rows, manualOrderIds, isManualOrderActive]);

  return {
    isManualOrderActive,
    draggingId,
    dragOverId,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    resetManualOrder,
    getOrderedRows,
  };
};
