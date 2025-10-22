import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { Database } from '@/database.types';

type ApplicationStatus = Database['public']['Enums']['application_status'];

export interface ApplicationFilters {
  search?: string;
  statuses?: ApplicationStatus[];
  agentIds?: string[];
  programIds?: string[];
  assignedToIds?: string[];
  isInternational?: boolean;
  requestedStart?: { from?: string; to?: string };
  proposedCommencement?: { from?: string; to?: string };
  createdAt?: { from?: string; to?: string };
  updatedAt?: { from?: string; to?: string };
  offerGeneratedAt?: { from?: string; to?: string };
  hasPaymentPlanTemplate?: 'yes' | 'no';
  hasTimetable?: 'yes' | 'no';
  hasUSI?: 'yes' | 'no';
  hasPassport?: 'yes' | 'no';
}

/**
 * Hook to manage application filters with URL synchronization.
 */
export const useApplicationsFilters = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse filters from URL
  const filters = useMemo((): ApplicationFilters => {
    const params = new URLSearchParams(searchParams);
    const result: ApplicationFilters = {};

    // Search
    const search = params.get('search');
    if (search) result.search = search;

    // Statuses (comma-separated)
    const statuses = params.get('statuses');
    if (statuses) {
      result.statuses = statuses.split(',') as ApplicationStatus[];
    }

    // Agent IDs
    const agentIds = params.get('agentIds');
    if (agentIds) {
      result.agentIds = agentIds.split(',');
    }

    // Program IDs
    const programIds = params.get('programIds');
    if (programIds) {
      result.programIds = programIds.split(',');
    }

    // Assigned To IDs
    const assignedToIds = params.get('assignedToIds');
    if (assignedToIds) {
      result.assignedToIds = assignedToIds.split(',');
    }

    // International flag
    const intl = params.get('intl');
    if (intl === 'true') result.isInternational = true;
    if (intl === 'false') result.isInternational = false;

    // Date ranges
    const requestedStartFrom = params.get('requestedStartFrom');
    const requestedStartTo = params.get('requestedStartTo');
    if (requestedStartFrom || requestedStartTo) {
      result.requestedStart = {};
      if (requestedStartFrom) result.requestedStart.from = requestedStartFrom;
      if (requestedStartTo) result.requestedStart.to = requestedStartTo;
    }

    const proposedCommFrom = params.get('proposedCommFrom');
    const proposedCommTo = params.get('proposedCommTo');
    if (proposedCommFrom || proposedCommTo) {
      result.proposedCommencement = {};
      if (proposedCommFrom) result.proposedCommencement.from = proposedCommFrom;
      if (proposedCommTo) result.proposedCommencement.to = proposedCommTo;
    }

    const createdFrom = params.get('createdFrom');
    const createdTo = params.get('createdTo');
    if (createdFrom || createdTo) {
      result.createdAt = {};
      if (createdFrom) result.createdAt.from = createdFrom;
      if (createdTo) result.createdAt.to = createdTo;
    }

    const updatedFrom = params.get('updatedFrom');
    const updatedTo = params.get('updatedTo');
    if (updatedFrom || updatedTo) {
      result.updatedAt = {};
      if (updatedFrom) result.updatedAt.from = updatedFrom;
      if (updatedTo) result.updatedAt.to = updatedTo;
    }

    const offerGenFrom = params.get('offerGenFrom');
    const offerGenTo = params.get('offerGenTo');
    if (offerGenFrom || offerGenTo) {
      result.offerGeneratedAt = {};
      if (offerGenFrom) result.offerGeneratedAt.from = offerGenFrom;
      if (offerGenTo) result.offerGeneratedAt.to = offerGenTo;
    }

    // Boolean flags
    const hasPaymentPlan = params.get('hasPaymentPlan');
    if (hasPaymentPlan === 'yes' || hasPaymentPlan === 'no') {
      result.hasPaymentPlanTemplate = hasPaymentPlan;
    }

    const hasTimetable = params.get('hasTimetable');
    if (hasTimetable === 'yes' || hasTimetable === 'no') {
      result.hasTimetable = hasTimetable;
    }

    const hasUSI = params.get('hasUSI');
    if (hasUSI === 'yes' || hasUSI === 'no') {
      result.hasUSI = hasUSI;
    }

    const hasPassport = params.get('hasPassport');
    if (hasPassport === 'yes' || hasPassport === 'no') {
      result.hasPassport = hasPassport;
    }

    return result;
  }, [searchParams]);

  // Update filters in URL
  const updateFilters = useCallback(
    (newFilters: ApplicationFilters) => {
      const params = new URLSearchParams(searchParams);

      // Clear existing filter params
      const filterKeys = [
        'search',
        'statuses',
        'agentIds',
        'programIds',
        'assignedToIds',
        'intl',
        'requestedStartFrom',
        'requestedStartTo',
        'proposedCommFrom',
        'proposedCommTo',
        'createdFrom',
        'createdTo',
        'updatedFrom',
        'updatedTo',
        'offerGenFrom',
        'offerGenTo',
        'hasPaymentPlan',
        'hasTimetable',
        'hasUSI',
        'hasPassport',
      ];
      filterKeys.forEach((key) => params.delete(key));

      // Set new filter params
      if (newFilters.search) params.set('search', newFilters.search);
      if (newFilters.statuses?.length)
        params.set('statuses', newFilters.statuses.join(','));
      if (newFilters.agentIds?.length)
        params.set('agentIds', newFilters.agentIds.join(','));
      if (newFilters.programIds?.length)
        params.set('programIds', newFilters.programIds.join(','));
      if (newFilters.assignedToIds?.length)
        params.set('assignedToIds', newFilters.assignedToIds.join(','));
      if (newFilters.isInternational !== undefined)
        params.set('intl', String(newFilters.isInternational));

      if (newFilters.requestedStart?.from)
        params.set('requestedStartFrom', newFilters.requestedStart.from);
      if (newFilters.requestedStart?.to)
        params.set('requestedStartTo', newFilters.requestedStart.to);

      if (newFilters.proposedCommencement?.from)
        params.set('proposedCommFrom', newFilters.proposedCommencement.from);
      if (newFilters.proposedCommencement?.to)
        params.set('proposedCommTo', newFilters.proposedCommencement.to);

      if (newFilters.createdAt?.from)
        params.set('createdFrom', newFilters.createdAt.from);
      if (newFilters.createdAt?.to)
        params.set('createdTo', newFilters.createdAt.to);

      if (newFilters.updatedAt?.from)
        params.set('updatedFrom', newFilters.updatedAt.from);
      if (newFilters.updatedAt?.to)
        params.set('updatedTo', newFilters.updatedAt.to);

      if (newFilters.offerGeneratedAt?.from)
        params.set('offerGenFrom', newFilters.offerGeneratedAt.from);
      if (newFilters.offerGeneratedAt?.to)
        params.set('offerGenTo', newFilters.offerGeneratedAt.to);

      if (newFilters.hasPaymentPlanTemplate)
        params.set('hasPaymentPlan', newFilters.hasPaymentPlanTemplate);
      if (newFilters.hasTimetable)
        params.set('hasTimetable', newFilters.hasTimetable);
      if (newFilters.hasUSI) params.set('hasUSI', newFilters.hasUSI);
      if (newFilters.hasPassport)
        params.set('hasPassport', newFilters.hasPassport);

      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    const filterKeys = [
      'search',
      'statuses',
      'agentIds',
      'programIds',
      'assignedToIds',
      'intl',
      'requestedStartFrom',
      'requestedStartTo',
      'proposedCommFrom',
      'proposedCommTo',
      'createdFrom',
      'createdTo',
      'updatedFrom',
      'updatedTo',
      'offerGenFrom',
      'offerGenTo',
      'hasPaymentPlan',
      'hasTimetable',
      'hasUSI',
      'hasPassport',
    ];
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
    if (filters.agentIds?.length) count++;
    if (filters.programIds?.length) count++;
    if (filters.assignedToIds?.length) count++;
    if (filters.isInternational !== undefined) count++;
    if (filters.requestedStart?.from || filters.requestedStart?.to) count++;
    if (filters.proposedCommencement?.from || filters.proposedCommencement?.to)
      count++;
    if (filters.createdAt?.from || filters.createdAt?.to) count++;
    if (filters.updatedAt?.from || filters.updatedAt?.to) count++;
    if (filters.offerGeneratedAt?.from || filters.offerGeneratedAt?.to) count++;
    if (filters.hasPaymentPlanTemplate) count++;
    if (filters.hasTimetable) count++;
    if (filters.hasUSI) count++;
    if (filters.hasPassport) count++;
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
export const serializeFilters = (filters: ApplicationFilters): string => {
  const sorted = Object.keys(filters)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = filters[key as keyof ApplicationFilters];
        return acc;
      },
      {} as Record<string, unknown>
    );
  return JSON.stringify(sorted);
};
