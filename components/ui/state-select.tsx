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

/** Overseas state code for international student addresses (AVETMISS). */
const OVERSEAS_STATE_OPTION = {
  value: 'OVS' as const,
  label: 'OVS (Overseas)',
};

type AustralianStateCode = (typeof AU_STATE_OPTIONS)[number]['value'];
export type StateSelectValue = AustralianStateCode | 'OVS';

const AU_STATE_CODES = new Set<AustralianStateCode>(
  AU_STATE_OPTIONS.map((option) => option.value)
);

type StateSelectProps = {
  value?: string | null;
  onValueChange?: (value: StateSelectValue) => void;
  countryCode?: string | null;
  /** When true, includes and allows "OVS (Overseas)" for international student addresses. */
  allowOverseas?: boolean;
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

const isOverseasState = (code?: string | null): code is 'OVS' => {
  return code?.trim().toUpperCase() === 'OVS';
};

/**
 * State selector that restricts values to Australian state enums.
 * When allowOverseas is true (e.g. international students), includes "OVS (Overseas)".
 */
export const StateSelect = ({
  value,
  onValueChange,
  countryCode,
  allowOverseas = false,
  placeholder = 'State / Province',
  disabled = false,
  className = 'w-full',
}: StateSelectProps) => {
  const normalizedCountry = normalizeCountry(countryCode);

  const ensureValidState = (next?: string | null) => {
    if (!onValueChange) return;
    if (allowOverseas && isOverseasState(next)) {
      if (next !== value) onValueChange('OVS');
      return;
    }
    if (isAustralianState(next)) {
      if (next !== value) onValueChange(next);
      return;
    }
    if (allowOverseas && isOverseasState(value)) {
      return;
    }
    if (value !== 'VIC') {
      onValueChange('VIC');
    }
  };

  useEffect(() => {
    ensureValidState(value);
  }, [normalizedCountry, value, onValueChange, allowOverseas]);

  const selectValue: string =
    allowOverseas && isOverseasState(value)
      ? 'OVS'
      : isAustralianState(value)
        ? value
        : 'VIC';

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
        {allowOverseas && (
          <SelectItem value={OVERSEAS_STATE_OPTION.value}>
            {OVERSEAS_STATE_OPTION.label}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};
