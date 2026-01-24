/**
 * Enrollment-related utility functions
 * Extracts business logic from UI components for better testability and maintainability
 */

/**
 * Group capacity threshold for "near full" warning
 * A group is considered "near full" when enrollment reaches this percentage of capacity
 */
export const GROUP_NEAR_FULL_THRESHOLD = 0.9;

/**
 * Check if a group is at full capacity
 * @param currentEnrollment - Current number of enrolled students
 * @param maxCapacity - Maximum capacity of the group
 * @returns true if the group is full
 */
export const isGroupFull = (
  currentEnrollment: number,
  maxCapacity: number
): boolean => {
  return currentEnrollment >= maxCapacity;
};

/**
 * Check if a group is near full capacity (90% or more)
 * @param currentEnrollment - Current number of enrolled students
 * @param maxCapacity - Maximum capacity of the group
 * @returns true if the group is near full
 */
export const isGroupNearFull = (
  currentEnrollment: number,
  maxCapacity: number
): boolean => {
  return currentEnrollment >= maxCapacity * GROUP_NEAR_FULL_THRESHOLD;
};

/**
 * Get the capacity status of a group
 * @param currentEnrollment - Current number of enrolled students
 * @param maxCapacity - Maximum capacity of the group
 * @returns Capacity status: 'full', 'near-full', or 'available'
 */
export const getGroupCapacityStatus = (
  currentEnrollment: number,
  maxCapacity: number
): 'full' | 'near-full' | 'available' => {
  if (isGroupFull(currentEnrollment, maxCapacity)) {
    return 'full';
  }
  if (isGroupNearFull(currentEnrollment, maxCapacity)) {
    return 'near-full';
  }
  return 'available';
};

/**
 * Extract cycle year from a program plan name
 * Supports formats like "2025", "2025-2026", "Academic Year 2025", etc.
 * @param planName - The name of the program plan
 * @returns The detected year or 'Current' if no year is found
 */
export const extractCycleYear = (planName?: string | null): string => {
  if (!planName) return 'Current';

  // Match 4-digit years (e.g., 2025, 2026, 2027)
  const yearMatch = planName.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    return yearMatch[1];
  }

  return 'Current';
};

/**
 * Get the first detected year from a program plan name
 * Useful for plans with ranges like "2025-2026" where we want the start year
 * @param planName - The name of the program plan
 * @returns The first detected year or null if no year is found
 */
export const getFirstYearFromPlanName = (
  planName?: string | null
): number | null => {
  if (!planName) return null;

  const yearMatch = planName.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }

  return null;
};

/**
 * Format group capacity for display
 * @param currentEnrollment - Current number of enrolled students
 * @param maxCapacity - Maximum capacity of the group
 * @returns Formatted string like "15/20"
 */
export const formatGroupCapacity = (
  currentEnrollment: number,
  maxCapacity: number
): string => {
  return `${currentEnrollment}/${maxCapacity}`;
};

/**
 * Calculate the percentage of capacity filled
 * @param currentEnrollment - Current number of enrolled students
 * @param maxCapacity - Maximum capacity of the group
 * @returns Percentage as a number between 0 and 100
 */
export const getCapacityPercentage = (
  currentEnrollment: number,
  maxCapacity: number
): number => {
  if (maxCapacity === 0) return 0;
  return Math.round((currentEnrollment / maxCapacity) * 100);
};

/**
 * Get an accessible label for a group's capacity status
 * @param groupName - Name of the group
 * @param currentEnrollment - Current number of enrolled students
 * @param maxCapacity - Maximum capacity of the group
 * @returns Accessible description of the group's capacity
 */
export const getGroupCapacityAriaLabel = (
  groupName: string,
  currentEnrollment: number,
  maxCapacity: number
): string => {
  const status = getGroupCapacityStatus(currentEnrollment, maxCapacity);
  const capacityText = formatGroupCapacity(currentEnrollment, maxCapacity);

  switch (status) {
    case 'full':
      return `${groupName} - Full (${capacityText})`;
    case 'near-full':
      return `${groupName} - Nearly full (${capacityText} enrolled)`;
    case 'available':
      return `${groupName} - ${capacityText} enrolled`;
  }
};
