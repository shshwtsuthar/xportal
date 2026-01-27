'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type DataTableHeaderProps = {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export const DataTableHeader = ({
  searchQuery = '',
  onSearchChange,
  placeholder = 'Search all columns...',
  className,
}: DataTableHeaderProps) => {
  if (!onSearchChange) return null;

  return (
    <div className={cn('border-b p-3', className)}>
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 text-sm"
          aria-label="Search table"
        />
      </div>
    </div>
  );
};
