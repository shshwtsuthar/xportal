import { useCallback } from 'react';
import type { ExportFormat } from '../types';

type UseExportOptions<T> = {
  rows: T[];
  visibleColumns: string[];
  getExportData?: (rows: T[]) => Record<string, unknown>[];
  exportFileName?: string;
};

export const useExport = <T>({
  rows,
  getExportData,
  exportFileName,
}: UseExportOptions<T>) => {
  const exportToCSV = useCallback(async () => {
    const Papa = (await import('papaparse')).default;

    const data = getExportData ? getExportData(rows) : rows;

    // Extract headers from first row if it's an object
    let headers: string[] = [];
    let exportRows: unknown[][] = [];

    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      headers = Object.keys(data[0] as Record<string, unknown>);
      exportRows = data.map((row) =>
        headers.map((key) => (row as Record<string, unknown>)[key] ?? '')
      );
    } else {
      exportRows = data as unknown[][];
    }

    const csv = Papa.unparse({ fields: headers, data: exportRows });
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      exportFileName || `export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rows, getExportData, exportFileName]);

  const exportToXLSX = useCallback(async () => {
    const XLSX = await import('xlsx');

    const data = getExportData ? getExportData(rows) : rows;

    // Extract headers from first row if it's an object
    let headers: string[] = [];
    let exportRows: unknown[][] = [];

    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      headers = Object.keys(data[0] as Record<string, unknown>);
      exportRows = data.map((row) =>
        headers.map((key) => (row as Record<string, unknown>)[key] ?? '')
      );
    } else {
      exportRows = data as unknown[][];
    }

    const aoa = headers.length > 0 ? [headers, ...exportRows] : exportRows;
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(
      wb,
      exportFileName || `export-${new Date().toISOString().split('T')[0]}.xlsx`
    );
  }, [rows, getExportData, exportFileName]);

  const exportTable = useCallback(
    async (format: ExportFormat) => {
      if (format === 'csv') {
        await exportToCSV();
      } else if (format === 'xlsx') {
        await exportToXLSX();
      }
    },
    [exportToCSV, exportToXLSX]
  );

  return {
    exportTable,
    exportToCSV,
    exportToXLSX,
  };
};
