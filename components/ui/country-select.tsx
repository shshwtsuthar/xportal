'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAllCountries } from '@/lib/utils/country';
import { useMemo } from 'react';

type CountrySelectProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowedCountries?: string[];
};

/**
 * Reusable country select component using ISO alpha-2 codes
 * Displays full country names but stores ISO alpha-2 codes (e.g., "AU", "US", "GB")
 */
export const CountrySelect = ({
  value,
  onValueChange,
  placeholder = 'Select country',
  disabled = false,
  className = 'w-full',
  allowedCountries,
}: CountrySelectProps) => {
  const countries = useMemo(() => getAllCountries(), []);
  const filteredCountries = useMemo(() => {
    if (!allowedCountries || allowedCountries.length === 0) {
      return countries;
    }
    const normalized = new Set(
      allowedCountries.map((code) => code.trim().toUpperCase())
    );
    const subset = countries.filter((country) =>
      normalized.has(country.code.toUpperCase())
    );
    return subset.length > 0 ? subset : countries;
  }, [allowedCountries, countries]);

  return (
    <Select
      value={value || ''}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {filteredCountries.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            {country.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
