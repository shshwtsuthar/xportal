import { useEffect, useMemo, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { getSubmissionMissingFields } from '@/src/schemas/application-submission';
import {
  deriveIsInternational,
  type ApplicationFormValues,
} from '@/src/lib/applicationSchema';

function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  delayMs: number
) {
  const timeoutRef = useRef<number | undefined>(undefined);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  return (...args: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      fnRef.current(...args);
    }, delayMs);
  };
}

export type ReadinessResult = {
  isReady: boolean;
  missing: string[];
  isValidating: boolean;
};

/**
 * Normalizes form values by converting Date objects to ISO strings (YYYY-MM-DD format).
 * This ensures consistency between client-side validation and server-side validation.
 * Matches the behavior of normalizeIncomingValues in application-submission.ts.
 */
function normalizeFormValuesForValidation(
  values: Partial<ApplicationFormValues>
): Partial<ApplicationFormValues> {
  const normalized = { ...values };

  // Date fields that may be Date objects in form state but need to be strings for validation
  const dateFields: Array<keyof ApplicationFormValues> = [
    'date_of_birth',
    'proposed_commencement_date',
    'payment_anchor_date',
    'passport_issue_date',
    'passport_expiry_date',
    'welfare_start_date',
    'oshc_start_date',
    'oshc_end_date',
    'english_test_date',
  ];

  for (const field of dateFields) {
    const value = normalized[field];
    if (value instanceof Date) {
      // Convert Date to ISO string and extract YYYY-MM-DD portion
      (normalized as Record<string, unknown>)[field] = value
        .toISOString()
        .split('T')[0];
    } else if (value && typeof value === 'string') {
      // Ensure string dates are in YYYY-MM-DD format if they're valid ISO dates
      // This matches normalizeIncomingValues behavior
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        // If it's a valid date string, normalize to YYYY-MM-DD
        (normalized as Record<string, unknown>)[field] = date
          .toISOString()
          .split('T')[0];
      }
    }
    // Note: null values are left as-is (will be handled by schema validation)
  }

  if (normalized.citizenship_status_code) {
    (normalized as Record<string, unknown>).is_international =
      deriveIsInternational(normalized.citizenship_status_code);
  }

  return normalized;
}

// Accept both draft (partial) and full form types
export function useSubmissionReadiness(
  form: UseFormReturn<Partial<ApplicationFormValues>>,
  debounceMs = 150
): ReadinessResult {
  const [missing, setMissing] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const recompute = useDebouncedCallback(() => {
    setIsValidating(true);
    try {
      const values = form.getValues();
      // Normalize Date objects to strings before validation
      const normalizedValues = normalizeFormValuesForValidation(values);

      // Ensure arrays are defined (default to empty array if undefined/null)
      // This prevents validation errors when arrays are required by flags
      if (!normalizedValues.disabilities) {
        (normalizedValues as Record<string, unknown>).disabilities = [];
      }
      if (!normalizedValues.prior_education) {
        (normalizedValues as Record<string, unknown>).prior_education = [];
      }

      // Normalize flags to ensure they're never undefined (default to '@')
      // This matches the behavior in handleSubmitApplication
      if (
        normalizedValues.disability_flag === null ||
        normalizedValues.disability_flag === undefined
      ) {
        (normalizedValues as Record<string, unknown>).disability_flag = '@';
      }
      if (
        normalizedValues.prior_education_flag === null ||
        normalizedValues.prior_education_flag === undefined
      ) {
        (normalizedValues as Record<string, unknown>).prior_education_flag =
          '@';
      }

      // Cast partial values to full values for validation (missing fields will be caught)
      const missingNow = getSubmissionMissingFields(
        normalizedValues as ApplicationFormValues
      );
      setMissing(missingNow);
    } catch {
      // If invalid intermediate state, keep as not-ready
      setMissing(['internal']);
    } finally {
      setIsValidating(false);
    }
  }, debounceMs);

  // Subscribe to any form change. This is a single subscription (not 45+ watchers).
  useEffect(() => {
    const subscription = form.watch(() => {
      setIsValidating(true);
      recompute();
    });
    // Initial compute
    recompute();
    return () => subscription.unsubscribe();
  }, [form, recompute]);

  const isReady = useMemo(
    () => !isValidating && missing.length === 0,
    [isValidating, missing]
  );
  return { isReady, missing, isValidating };
}
