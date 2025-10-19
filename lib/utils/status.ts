/**
 * Calculate the status of a date range based on current date.
 * @param startDate - The start date (ISO string or null)
 * @param endDate - The end date (ISO string or null)
 * @returns Status indicating whether the date range is completed, ongoing, or upcoming
 */
export const calculateDateRangeStatus = (
  startDate: string | null,
  endDate: string | null
): 'Completed' | 'Ongoing' | 'Upcoming' => {
  const currentDate = new Date();

  // Handle null dates gracefully
  if (!startDate || !endDate) {
    return 'Upcoming';
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // If current date is after the end date, it's completed
  if (currentDate > end) {
    return 'Completed';
  }

  // If current date is between start and end (inclusive), it's ongoing
  if (currentDate >= start && currentDate <= end) {
    return 'Ongoing';
  }

  // If current date is before the start date, it's upcoming
  return 'Upcoming';
};
