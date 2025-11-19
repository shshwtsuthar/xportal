import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';
import type { ApplicationFilters } from './useApplicationsFilters';
import { serializeFilters } from './useApplicationsFilters';

/**
 * Fetch applications with comprehensive filters.
 * @param filters optional application filters object
 * @param options toggles like includeArchived to override default guards
 * @returns TanStack Query result with list of applications
 */

type ApplicationWithAgent = Tables<'applications'> & {
  agents?: Pick<Tables<'agents'>, 'name'> | null;
  programs?: Pick<Tables<'programs'>, 'name'> | null;
};

type UseGetApplicationsOptions = {
  includeArchived?: boolean;
};

export const useGetApplications = (
  filters?: ApplicationFilters,
  options?: UseGetApplicationsOptions
) => {
  return useQuery({
    queryKey: ['applications', filters ? serializeFilters(filters) : 'all'],
    queryFn: async (): Promise<ApplicationWithAgent[]> => {
      const supabase = createClient();
      let query = supabase
        .from('applications')
        .select('*, agents(name), programs(name)')
        .order('updated_at', { ascending: false });

      const includeArchived = options?.includeArchived ?? false;
      const statusesFilter = filters?.statuses ?? [];
      const shouldGuardArchived =
        !includeArchived && statusesFilter.length === 0;

      if (shouldGuardArchived) {
        query = query.neq('status', 'ARCHIVED');
      }

      if (!filters) {
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data ?? [];
      }

      // Apply filters
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(
          `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},id.ilike.${searchTerm}`
        );
      }

      if (statusesFilter.length) {
        query = query.in('status', statusesFilter);
      }

      if (filters.agentIds?.length) {
        query = query.in('agent_id', filters.agentIds);
      }

      if (filters.programIds?.length) {
        query = query.in('program_id', filters.programIds);
      }

      if (filters.assignedToIds?.length) {
        query = query.in('assigned_to', filters.assignedToIds);
      }

      if (filters.isInternational !== undefined) {
        query = query.eq('is_international', filters.isInternational);
      }

      if (filters.requestedStart?.from) {
        query = query.gte('requested_start_date', filters.requestedStart.from);
      }
      if (filters.requestedStart?.to) {
        query = query.lte('requested_start_date', filters.requestedStart.to);
      }

      if (filters.proposedCommencement?.from) {
        query = query.gte(
          'proposed_commencement_date',
          filters.proposedCommencement.from
        );
      }
      if (filters.proposedCommencement?.to) {
        query = query.lte(
          'proposed_commencement_date',
          filters.proposedCommencement.to
        );
      }

      if (filters.createdAt?.from) {
        query = query.gte('created_at', filters.createdAt.from);
      }
      if (filters.createdAt?.to) {
        query = query.lte('created_at', filters.createdAt.to);
      }

      if (filters.updatedAt?.from) {
        query = query.gte('updated_at', filters.updatedAt.from);
      }
      if (filters.updatedAt?.to) {
        query = query.lte('updated_at', filters.updatedAt.to);
      }

      if (filters.offerGeneratedAt?.from) {
        query = query.gte('offer_generated_at', filters.offerGeneratedAt.from);
      }
      if (filters.offerGeneratedAt?.to) {
        query = query.lte('offer_generated_at', filters.offerGeneratedAt.to);
      }

      if (filters.hasPaymentPlanTemplate === 'yes') {
        query = query.not('payment_plan_template_id', 'is', null);
      } else if (filters.hasPaymentPlanTemplate === 'no') {
        query = query.is('payment_plan_template_id', null);
      }

      if (filters.hasTimetable === 'yes') {
        query = query.not('timetable_id', 'is', null);
      } else if (filters.hasTimetable === 'no') {
        query = query.is('timetable_id', null);
      }

      if (filters.hasUSI === 'yes') {
        query = query.not('usi', 'is', null);
      } else if (filters.hasUSI === 'no') {
        query = query.is('usi', null);
      }

      if (filters.hasPassport === 'yes') {
        query = query.not('passport_number', 'is', null);
      } else if (filters.hasPassport === 'no') {
        query = query.is('passport_number', null);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
};
