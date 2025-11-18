'use client';

import { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AU_STATE_OPTIONS = [
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NSW', label: 'New South Wales' },
  { value: 'NT', label: 'Northern Territory' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'WA', label: 'Western Australia' },
] as const;

type AustralianStateCode = (typeof AU_STATE_OPTIONS)[number]['value'];

const AU_STATE_CODES = new Set<AustralianStateCode>(
  AU_STATE_OPTIONS.map((option) => option.value)
);

type StateSelectProps = {
  value?: string | null;
  onValueChange?: (value: AustralianStateCode) => void;
  countryCode?: string | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const normalizeCountry = (code?: string | null) => {
  if (!code) return '';
  return code.trim().toUpperCase();
};

const isAustralianCountry = (code?: string | null) => {
  const normalized = normalizeCountry(code);
  if (!normalized) return false;
  return (
    normalized === 'AU' || normalized === 'AUS' || normalized === 'AUSTRALIA'
  );
};

const isAustralianState = (
  code?: string | null
): code is AustralianStateCode => {
  if (!code) return false;
  return AU_STATE_CODES.has(code as AustralianStateCode);
};

/**
 * State selector that restricts values to Australian state enums.
 */
export const StateSelect = ({
  value,
  onValueChange,
  countryCode,
  placeholder = 'State / Province',
  disabled = false,
  className = 'w-full',
}: StateSelectProps) => {
  const normalizedCountry = normalizeCountry(countryCode);

  const ensureValidState = (next?: string | null) => {
    if (!onValueChange) return;
    if (isAustralianState(next)) {
      if (next !== value) {
        onValueChange(next);
      }
      return;
    }
    if (value !== 'VIC') {
      onValueChange('VIC');
    }
  };

  useEffect(() => {
    ensureValidState(value);
  }, [normalizedCountry, value, onValueChange]);

  const selectValue = isAustralianState(value) ? value : 'VIC';

  return (
    <Select
      value={selectValue}
      onValueChange={(selected) => ensureValidState(selected)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {AU_STATE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
