/**
 * FieldInput Components
 *
 * Type-specific input components for filter rule values.
 * Renders appropriate input based on field type (text, number, date, enum, boolean).
 */

'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { FieldType, Operator } from '@/src/lib/filters/types';

/**
 * Props for field input components
 */
export interface FieldInputProps {
  /** Field type */
  type: FieldType;
  /** Current value */
  value:
    | string
    | number
    | boolean
    | string[]
    | number[]
    | Date
    | null
    | undefined;
  /** Value change handler */
  onChange: (
    value:
      | string
      | number
      | boolean
      | string[]
      | number[]
      | Date
      | null
      | undefined
  ) => void;
  /** Operator (affects input behavior) */
  operator: Operator;
  /** For enum fields, the list of options */
  options?: string[];
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
}

/**
 * Text input component
 */
const TextInput: React.FC<FieldInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  return (
    <Input
      type="text"
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full"
    />
  );
};

/**
 * Number input component
 */
const NumberInput: React.FC<FieldInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
  operator,
}) => {
  // For 'in' and 'notIn' operators, show multiple number inputs
  if (operator === 'in' || operator === 'notIn') {
    const values =
      Array.isArray(value) && value.every((v) => typeof v === 'number')
        ? (value as number[])
        : [];

    const handleAddValue = () => {
      onChange([...values, 0]);
    };

    const handleRemoveValue = (index: number) => {
      onChange(values.filter((_, i) => i !== index));
    };

    const handleValueChange = (index: number, newValue: string) => {
      const numValue = newValue === '' ? 0 : Number(newValue);
      const newValues = [...values];
      newValues[index] = numValue;
      onChange(newValues.filter((v) => v !== 0 && !isNaN(v)));
    };

    return (
      <div className="space-y-2">
        {values.map((val, index) => (
          <div key={index} className="flex gap-2">
            <Input
              type="number"
              value={typeof val === 'number' ? val : ''}
              onChange={(e) => handleValueChange(index, e.target.value)}
              placeholder={placeholder || 'Enter number'}
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveValue(index)}
              disabled={disabled}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddValue}
          disabled={disabled}
        >
          Add Value
        </Button>
      </div>
    );
  }

  return (
    <Input
      type="number"
      value={typeof value === 'number' ? value : ''}
      onChange={(e) => {
        const numValue =
          e.target.value === '' ? undefined : Number(e.target.value);
        onChange(numValue);
      }}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full"
    />
  );
};

/**
 * Date input component
 */
const DateInput: React.FC<FieldInputProps> = ({
  value,
  onChange,
  disabled,
  operator,
}) => {
  // For date range operators, show two date pickers
  if (
    operator === 'gte' ||
    operator === 'lte' ||
    operator === 'gt' ||
    operator === 'lt'
  ) {
    // Single date picker for range operators
    const date =
      typeof value === 'string' || value instanceof Date
        ? new Date(value)
        : undefined;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'PPP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(date) => onChange(date ? date.toISOString() : undefined)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Single date picker for equality operators
  const date =
    typeof value === 'string' || value instanceof Date
      ? new Date(value)
      : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP') : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(date) => onChange(date ? date.toISOString() : undefined)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

/**
 * Enum select component
 */
const EnumInput: React.FC<FieldInputProps> = ({
  value,
  onChange,
  options = [],
  disabled,
  operator,
}) => {
  // For 'in' and 'notIn' operators, show multi-select
  if (operator === 'in' || operator === 'notIn') {
    const values =
      Array.isArray(value) && value.every((v) => typeof v === 'string')
        ? (value as string[])
        : [];

    const handleToggle = (option: string) => {
      if (values.includes(option)) {
        onChange(values.filter((v) => v !== option));
      } else {
        onChange([...values, option]);
      }
    };

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Button
              key={option}
              type="button"
              variant={values.includes(option) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleToggle(option)}
              disabled={disabled}
            >
              {option}
            </Button>
          ))}
        </div>
        {values.length > 0 && (
          <div className="text-muted-foreground text-sm">
            Selected: {values.join(', ')}
          </div>
        )}
      </div>
    );
  }

  // Single select for other operators
  return (
    <Select
      value={typeof value === 'string' ? value : ''}
      onValueChange={(val: string) => onChange(val)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select value" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

/**
 * Boolean input component
 */
const BooleanInput: React.FC<FieldInputProps> = ({
  value,
  onChange,
  disabled,
}) => {
  return (
    <Select
      value={value === undefined || value === null ? '' : String(value)}
      onValueChange={(val) => {
        if (val === 'true') onChange(true);
        else if (val === 'false') onChange(false);
        else onChange(undefined);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select value" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="true">True</SelectItem>
        <SelectItem value="false">False</SelectItem>
      </SelectContent>
    </Select>
  );
};

/**
 * Main FieldInput component
 * Renders the appropriate input based on field type
 */
export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { type, operator } = props;

  // Nullary operators don't need a value input
  if (operator === 'isNull' || operator === 'isNotNull') {
    return (
      <div className="text-muted-foreground py-2 text-sm">
        {operator === 'isNull' ? 'Field is null' : 'Field is not null'}
      </div>
    );
  }

  switch (type) {
    case 'text':
      return <TextInput {...props} />;
    case 'number':
      return <NumberInput {...props} />;
    case 'date':
      return <DateInput {...props} />;
    case 'enum':
      return <EnumInput {...props} />;
    case 'boolean':
      return <BooleanInput {...props} />;
    default:
      return <TextInput {...props} />;
  }
};
