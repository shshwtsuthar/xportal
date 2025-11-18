'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import {
  formatDateForDisplay,
  parseDateFromDisplay,
  applyDateMask,
} from '@/lib/utils/date-input';

export interface DateInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    'type' | 'value' | 'onChange'
  > {
  value?: string | Date;
  onChange?: (value: string) => void;
  placeholder?: string;
}

/**
 * DateInput component that displays dates in dd/mm/yyyy format
 * but stores them as YYYY-MM-DD strings for database compatibility
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, placeholder = 'dd/mm/yyyy', ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>('');

    // Update display value when prop value changes
    React.useEffect(() => {
      const formatted = formatDateForDisplay(value);
      setDisplayValue(formatted);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const masked = applyDateMask(inputValue);
      setDisplayValue(masked);

      // Parse to YYYY-MM-DD format
      const parsed = parseDateFromDisplay(masked);
      if (onChange) {
        onChange(parsed || '');
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const masked = applyDateMask(pastedText);
      setDisplayValue(masked);

      // Parse to YYYY-MM-DD format
      const parsed = parseDateFromDisplay(masked);
      if (onChange) {
        onChange(parsed || '');
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow backspace, delete, tab, escape, enter, and arrow keys
      if (
        [
          'Backspace',
          'Delete',
          'Tab',
          'Escape',
          'Enter',
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
        ].includes(e.key)
      ) {
        return;
      }

      // Allow Ctrl/Cmd + A, C, V, X
      if (e.ctrlKey || e.metaKey) {
        if (['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
          return;
        }
      }

      // Only allow numeric input
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={10}
        {...props}
      />
    );
  }
);

DateInput.displayName = 'DateInput';
