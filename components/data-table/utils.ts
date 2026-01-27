import type { DataTableColumnDef } from './types';

/**
 * Get default width for a column
 */
export const getColumnWidth = <T>(
  column: DataTableColumnDef<T>,
  savedWidths: Record<string, number>
): number => {
  if (savedWidths[column.id]) {
    return savedWidths[column.id];
  }
  return column.defaultWidth ?? column.size ?? 160;
};

/**
 * Get minimum width for a column
 */
export const getColumnMinWidth = <T>(column: DataTableColumnDef<T>): number => {
  return column.minWidth ?? 100;
};

/**
 * Get maximum width for a column
 */
export const getColumnMaxWidth = <T>(column: DataTableColumnDef<T>): number => {
  return column.maxWidth ?? 600;
};

/**
 * Extract text content from React node for search
 */
export const extractTextFromNode = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (node === null || node === undefined) {
    return '';
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromNode).join(' ');
  }
  if (typeof node === 'object' && 'props' in node) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.props?.children) {
      return extractTextFromNode(element.props.children);
    }
  }
  return '';
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
