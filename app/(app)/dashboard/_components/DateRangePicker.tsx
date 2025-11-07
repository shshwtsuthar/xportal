'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { DateRange as ReactDayPickerDateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Use react-day-picker's DateRange type which requires 'from' to be non-optional
type DateRange = ReactDayPickerDateRange | undefined;

interface DateRangePickerProps {
  value?: ReactDayPickerDateRange;
  onChange: (range: ReactDayPickerDateRange | undefined) => void;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function DateRangePicker({
  value,
  onChange,
  className,
  open,
  onOpenChange,
  trigger,
}: DateRangePickerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  const handleSelect = (range: ReactDayPickerDateRange | undefined) => {
    onChange(range);
    // Close popover when both dates are selected
    if (range?.from && range?.to) {
      setIsOpen(false);
    }
  };

  const displayText = React.useMemo(() => {
    if (!value?.from) {
      return 'Select date range';
    }

    if (value.from && !value.to) {
      return format(value.from, 'dd MMM yyyy');
    }

    if (value.from && value.to) {
      return `${format(value.from, 'dd MMM yyyy')} - ${format(value.to, 'dd MMM yyyy')}`;
    }

    return 'Select date range';
  }, [value]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      ) : (
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !value?.from && 'text-muted-foreground',
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText}
          </Button>
        </PopoverTrigger>
      )}
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={handleSelect}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
