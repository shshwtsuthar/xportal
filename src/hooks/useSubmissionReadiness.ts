import { useEffect, useMemo, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { getSubmissionMissingFields } from '@/src/schemas/application-submission';
import type { ApplicationFormValues } from '@/src/schemas/application';

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
      // Cast partial values to full values for validation (missing fields will be caught)
      const missingNow = getSubmissionMissingFields(
        values as ApplicationFormValues
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
