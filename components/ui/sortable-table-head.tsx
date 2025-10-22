'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableTableHeadProps {
  children: React.ReactNode;
  onSort?: () => void;
  sortDirection?: 'asc' | 'desc' | null;
  className?: string;
}

export function SortableTableHead({
  children,
  onSort,
  sortDirection,
  className,
}: SortableTableHeadProps) {
  return (
    <th
      className={cn(
        'text-muted-foreground group h-12 px-4 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0',
        onSort && 'hover:text-foreground cursor-pointer',
        className
      )}
      onClick={onSort}
    >
      <div className="flex items-center gap-2">
        <span>{children}</span>
        {onSort && (
          <div className="flex flex-col">
            <ChevronUp
              className={cn(
                'h-3 w-3 transition-opacity',
                sortDirection === 'asc'
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-50'
              )}
            />
            <ChevronDown
              className={cn(
                '-mt-1 h-3 w-3 transition-opacity',
                sortDirection === 'desc'
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-50'
              )}
            />
          </div>
        )}
      </div>
    </th>
  );
}
