import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { Database } from '@/database.types';

type InvoiceStatus = Database['public']['Enums']['invoice_status'];

export interface InvoiceFilters {
  search?: string;
  statuses?: InvoiceStatus[];
  issueDate?: { from?: string; to?: string };
  dueDate?: { from?: string; to?: string };
  amountDue?: { min?: number; max?: number };
  amountPaid?: { min?: number; max?: number };
  balance?: { min?: number; max?: number };
  programIds?: string[];
  emailed?: 'yes' | 'no';
  hasPdf?: 'yes' | 'no';
  overdueDays?: { min?: number; max?: number };
}

/**
 * Hook to manage invoice filters with URL synchronization.
 */
export const useInvoicesFilters = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters = useMemo((): InvoiceFilters => {
    const params = new URLSearchParams(searchParams);
    const result: InvoiceFilters = {};

    const search = params.get('search');
    if (search) result.search = search;

    const statuses = params.get('statuses');
    if (statuses) result.statuses = statuses.split(',') as InvoiceStatus[];

    const issueFrom = params.get('issueFrom');
    const issueTo = params.get('issueTo');
    if (issueFrom || issueTo) {
      result.issueDate = {};
      if (issueFrom) result.issueDate.from = issueFrom;
      if (issueTo) result.issueDate.to = issueTo;
    }

    const dueFrom = params.get('dueFrom');
    const dueTo = params.get('dueTo');
    if (dueFrom || dueTo) {
      result.dueDate = {};
      if (dueFrom) result.dueDate.from = dueFrom;
      if (dueTo) result.dueDate.to = dueTo;
    }

    const amountDueMin = params.get('amountDueMin');
    const amountDueMax = params.get('amountDueMax');
    if (amountDueMin || amountDueMax) {
      result.amountDue = {};
      if (amountDueMin) result.amountDue.min = Number(amountDueMin);
      if (amountDueMax) result.amountDue.max = Number(amountDueMax);
    }

    const amountPaidMin = params.get('amountPaidMin');
    const amountPaidMax = params.get('amountPaidMax');
    if (amountPaidMin || amountPaidMax) {
      result.amountPaid = {};
      if (amountPaidMin) result.amountPaid.min = Number(amountPaidMin);
      if (amountPaidMax) result.amountPaid.max = Number(amountPaidMax);
    }

    const balMin = params.get('balanceMin');
    const balMax = params.get('balanceMax');
    if (balMin || balMax) {
      result.balance = {};
      if (balMin) result.balance.min = Number(balMin);
      if (balMax) result.balance.max = Number(balMax);
    }

    const programIds = params.get('programIds');
    if (programIds) result.programIds = programIds.split(',');

    const emailed = params.get('emailed');
    if (emailed === 'yes' || emailed === 'no') result.emailed = emailed;

    const hasPdf = params.get('hasPdf');
    if (hasPdf === 'yes' || hasPdf === 'no') result.hasPdf = hasPdf;

    const odMin = params.get('overdueDaysMin');
    const odMax = params.get('overdueDaysMax');
    if (odMin || odMax) {
      result.overdueDays = {};
      if (odMin) result.overdueDays.min = Number(odMin);
      if (odMax) result.overdueDays.max = Number(odMax);
    }

    return result;
  }, [searchParams]);

  const updateFilters = useCallback(
    (newFilters: InvoiceFilters) => {
      const params = new URLSearchParams(searchParams);

      const keys = [
        'search',
        'statuses',
        'issueFrom',
        'issueTo',
        'dueFrom',
        'dueTo',
        'amountDueMin',
        'amountDueMax',
        'amountPaidMin',
        'amountPaidMax',
        'balanceMin',
        'balanceMax',
        'programIds',
        'emailed',
        'hasPdf',
        'overdueDaysMin',
        'overdueDaysMax',
      ];
      keys.forEach((k) => params.delete(k));

      if (newFilters.search) params.set('search', newFilters.search);
      if (newFilters.statuses?.length)
        params.set('statuses', newFilters.statuses.join(','));

      if (newFilters.issueDate?.from)
        params.set('issueFrom', newFilters.issueDate.from);
      if (newFilters.issueDate?.to)
        params.set('issueTo', newFilters.issueDate.to);

      if (newFilters.dueDate?.from)
        params.set('dueFrom', newFilters.dueDate.from);
      if (newFilters.dueDate?.to) params.set('dueTo', newFilters.dueDate.to);

      if (newFilters.amountDue?.min !== undefined)
        params.set('amountDueMin', String(newFilters.amountDue.min));
      if (newFilters.amountDue?.max !== undefined)
        params.set('amountDueMax', String(newFilters.amountDue.max));

      if (newFilters.amountPaid?.min !== undefined)
        params.set('amountPaidMin', String(newFilters.amountPaid.min));
      if (newFilters.amountPaid?.max !== undefined)
        params.set('amountPaidMax', String(newFilters.amountPaid.max));

      if (newFilters.balance?.min !== undefined)
        params.set('balanceMin', String(newFilters.balance.min));
      if (newFilters.balance?.max !== undefined)
        params.set('balanceMax', String(newFilters.balance.max));

      if (newFilters.programIds?.length)
        params.set('programIds', newFilters.programIds.join(','));

      if (newFilters.emailed) params.set('emailed', newFilters.emailed);
      if (newFilters.hasPdf) params.set('hasPdf', newFilters.hasPdf);

      if (newFilters.overdueDays?.min !== undefined)
        params.set('overdueDaysMin', String(newFilters.overdueDays.min));
      if (newFilters.overdueDays?.max !== undefined)
        params.set('overdueDaysMax', String(newFilters.overdueDays.max));

      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const resetFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    const keys = [
      'search',
      'statuses',
      'issueFrom',
      'issueTo',
      'dueFrom',
      'dueTo',
      'amountDueMin',
      'amountDueMax',
      'amountPaidMin',
      'amountPaidMax',
      'balanceMin',
      'balanceMax',
      'programIds',
      'emailed',
      'hasPdf',
      'overdueDaysMin',
      'overdueDaysMax',
    ];
    keys.forEach((k) => params.delete(k));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const hasActiveFilters = useMemo(
    () => Object.keys(filters).length > 0,
    [filters]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.statuses?.length) count++;
    if (filters.issueDate?.from || filters.issueDate?.to) count++;
    if (filters.dueDate?.from || filters.dueDate?.to) count++;
    if (
      filters.amountDue?.min !== undefined ||
      filters.amountDue?.max !== undefined
    )
      count++;
    if (
      filters.amountPaid?.min !== undefined ||
      filters.amountPaid?.max !== undefined
    )
      count++;
    if (
      filters.balance?.min !== undefined ||
      filters.balance?.max !== undefined
    )
      count++;
    if (filters.programIds?.length) count++;
    if (filters.emailed) count++;
    if (filters.hasPdf) count++;
    if (
      filters.overdueDays?.min !== undefined ||
      filters.overdueDays?.max !== undefined
    )
      count++;
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

export const serializeInvoicesFilters = (filters: InvoiceFilters): string => {
  const sorted = Object.keys(filters)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = filters[key as keyof InvoiceFilters];
        return acc;
      },
      {} as Record<string, unknown>
    );
  return JSON.stringify(sorted);
};
