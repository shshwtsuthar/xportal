/**
 * Date utilities for AEST (Australia Melbourne) timezone
 * All date operations should use these utilities to ensure consistency
 */

/**
 * Format a Date object to YYYY-MM-DD string in local timezone (AEST)
 * This avoids timezone conversion issues when working with dates
 */
export const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Create a Date object from YYYY-MM-DD string in local timezone (AEST)
 * This ensures dates are created in local timezone, not UTC
 */
export const createLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Add days to a date in local timezone (AEST)
 * Returns the new date as YYYY-MM-DD string
 */
export const addDaysToLocalDate = (
  dateString: string,
  days: number
): string => {
  const date = createLocalDate(dateString);
  const newDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days
  );
  return formatDateToLocal(newDate);
};

/**
 * Calculate due dates for installments based on anchor date and offsets
 * All calculations are done in local timezone (AEST)
 */
export const calculateDueDates = (
  anchorDateString: string,
  installments: Array<{
    name: string;
    amount_cents: number;
    due_date_rule_days: number;
  }>
): Array<{ name: string; amount: number; due: string }> => {
  return installments.map((installment) => ({
    name: installment.name,
    amount: installment.amount_cents / 100,
    due: addDaysToLocalDate(anchorDateString, installment.due_date_rule_days),
  }));
};
