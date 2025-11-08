import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { Database } from '@/database.types';

type StudentStatus = Database['public']['Enums']['student_status'];

export interface StudentFilters {
  search?: string;
  statuses?: StudentStatus[];
  createdAt?: { from?: string; to?: string };
}

/**
 * Hook to manage student filters with URL synchronization.
 */
export const useStudentsFilters = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse filters from URL
  const filters = useMemo((): StudentFilters => {
    const params = new URLSearchParams(searchParams);
    const result: StudentFilters = {};

    // Search
    const search = params.get('search');
    if (search) result.search = search;

    // Statuses (comma-separated)
    const statuses = params.get('statuses');
    if (statuses) {
      result.statuses = statuses.split(',') as StudentStatus[];
    }

    // Date ranges
    const createdFrom = params.get('createdFrom');
    const createdTo = params.get('createdTo');
    if (createdFrom || createdTo) {
      result.createdAt = {};
      if (createdFrom) result.createdAt.from = createdFrom;
      if (createdTo) result.createdAt.to = createdTo;
    }

    return result;
  }, [searchParams]);

  // Update filters in URL
  const updateFilters = useCallback(
    (newFilters: StudentFilters) => {
      const params = new URLSearchParams(searchParams);

      // Clear existing filter params
      const filterKeys = ['search', 'statuses', 'createdFrom', 'createdTo'];
      filterKeys.forEach((key) => params.delete(key));

      // Set new filter params
      if (newFilters.search) params.set('search', newFilters.search);
      if (newFilters.statuses?.length)
        params.set('statuses', newFilters.statuses.join(','));

      if (newFilters.createdAt?.from)
        params.set('createdFrom', newFilters.createdAt.from);
      if (newFilters.createdAt?.to)
        params.set('createdTo', newFilters.createdAt.to);

      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    const filterKeys = ['search', 'statuses', 'createdFrom', 'createdTo'];
    filterKeys.forEach((key) => params.delete(key));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).length > 0;
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.statuses?.length) count++;
    if (filters.createdAt?.from || filters.createdAt?.to) count++;
    return count;
  }, [filters]);

  return {
    filters,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
  };
};

/**
 * Serialize filters for TanStack Query cache key.
 */
export const serializeFilters = (filters: StudentFilters): string => {
  const sorted = Object.keys(filters)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = filters[key as keyof StudentFilters];
        return acc;
      },
      {} as Record<string, unknown>
    );
  return JSON.stringify(sorted);
};
