import { useState, useCallback } from 'react';
import type { DataTableColumnDef } from '../types';

type UseColumnReorderingOptions<T> = {
  columns: DataTableColumnDef<T>[];
  columnOrder?: string[];
  onReorder?: (reorderedColumns: string[]) => void;
};

export const useColumnReordering = <T>({
  columns,
  columnOrder,
  onReorder,
}: UseColumnReorderingOptions<T>) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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

    const currentOrder = columnOrder ?? columns.map((c) => c.id);
    const fromIndex = currentOrder.indexOf(draggingId);
    const toIndex = currentOrder.indexOf(dragOverId);

    if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
      const newOrder = [...currentOrder];
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, removed);
      onReorder?.(newOrder);
    }

    setDraggingId(null);
    setDragOverId(null);
  }, [draggingId, dragOverId, columnOrder, columns, onReorder]);

  return {
    draggingId,
    dragOverId,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
  };
};
