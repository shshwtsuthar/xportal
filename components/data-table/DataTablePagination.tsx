'use client';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Table } from '@tanstack/react-table';

type DataTablePaginationProps<T> = {
  table: Table<T>;
  pageSizeOptions?: number[];
};

export const DataTablePagination = <T,>({
  table,
  pageSizeOptions = [10, 25, 50, 100],
}: DataTablePaginationProps<T>) => {
  const {
    getState,
    setPageIndex,
    setPageSize,
    getPageCount,
    getCanPreviousPage,
    getCanNextPage,
  } = table;
  const { pagination } = getState();
  const currentPage = pagination.pageIndex + 1;
  const totalPages = getPageCount();

  // Generate page numbers to display (max 7 pages)
  const getPageNumbers = () => {
    const pages: number[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (currentPage <= 4) {
      for (let i = 1; i <= 7; i++) {
        pages.push(i);
      }
    } else if (currentPage >= totalPages - 3) {
      for (let i = totalPages - 6; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      for (let i = currentPage - 3; i <= currentPage + 3; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col gap-4 border-t px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          Rows per page:
        </span>
        <Select
          value={pagination.pageSize.toString()}
          onValueChange={(value) => {
            setPageSize(Number(value));
            setPageIndex(0);
          }}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-center sm:justify-end">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                className={
                  !getCanPreviousPage()
                    ? 'pointer-events-none opacity-50'
                    : 'cursor-pointer'
                }
                aria-disabled={!getCanPreviousPage()}
              />
            </PaginationItem>
            {getPageNumbers().map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  onClick={() => setPageIndex(pageNum - 1)}
                  isActive={currentPage === pageNum}
                  className="cursor-pointer"
                  aria-label={`Go to page ${pageNum}`}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setPageIndex((p) => Math.min(totalPages - 1, p + 1))
                }
                className={
                  !getCanNextPage()
                    ? 'pointer-events-none opacity-50'
                    : 'cursor-pointer'
                }
                aria-disabled={!getCanNextPage()}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};
