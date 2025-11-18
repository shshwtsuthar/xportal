/**
 * Date input utilities for converting between dd/mm/yyyy display format
 * and YYYY-MM-DD storage format
 */

/**
 * Converts a date from YYYY-MM-DD string or Date object to dd/mm/yyyy display format
 * @param date - Date string (YYYY-MM-DD) or Date object or undefined
 * @returns Formatted string in dd/mm/yyyy format or empty string
 */
export const formatDateForDisplay = (
  date: string | Date | undefined
): string => {
  if (!date) return '';

  let dateObj: Date;
  if (typeof date === 'string') {
    // Parse YYYY-MM-DD format
    const [year, month, day] = date.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
    dateObj = new Date(year, month - 1, day);
  } else {
    dateObj = date;
  }

  // Validate date
  if (isNaN(dateObj.getTime())) return '';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Converts a date from dd/mm/yyyy display format to YYYY-MM-DD storage format
 * @param value - Date string in dd/mm/yyyy format
 * @returns Date string in YYYY-MM-DD format or undefined if invalid
 */
export const parseDateFromDisplay = (value: string): string | undefined => {
  if (!value) return undefined;

  // Remove all non-numeric characters except slashes
  const cleaned = value.replace(/[^\d/]/g, '');

  // Split by slash
  const parts = cleaned.split('/').filter(Boolean);

  if (parts.length !== 3) return undefined;

  const [day, month, year] = parts.map(Number);

  // Validate components
  if (isNaN(day) || isNaN(month) || isNaN(year)) return undefined;
  if (day < 1 || day > 31) return undefined;
  if (month < 1 || month > 12) return undefined;
  if (year < 1900 || year > 9999) return undefined;

  // Validate actual date (e.g., 31/02/2020 is invalid)
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getDate() !== day ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getFullYear() !== year
  ) {
    return undefined;
  }

  // Convert to YYYY-MM-DD
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Validates if a date string is in valid dd/mm/yyyy format
 * @param value - Date string to validate
 * @returns true if valid, false otherwise
 */
export const validateDateInput = (value: string): boolean => {
  if (!value) return true; // Empty is valid (optional fields)

  const parsed = parseDateFromDisplay(value);
  return parsed !== undefined;
};

/**
 * Applies date masking as user types, enforcing dd/mm/yyyy format
 * @param value - Current input value
 * @returns Masked value with slashes inserted at appropriate positions
 */
export const applyDateMask = (value: string): string => {
  // Remove all non-numeric characters
  const digits = value.replace(/\D/g, '');

  // Limit to 8 digits (ddmmyyyy)
  const limited = digits.slice(0, 8);

  // Insert slashes at positions 2 and 5
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 4) {
    return `${limited.slice(0, 2)}/${limited.slice(2)}`;
  } else {
    return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
  }
};
