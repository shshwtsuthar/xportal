/**
 * Recipient computation logic for announcements.
 * Builds Supabase queries based on filter criteria to compute recipient lists.
 */

import { createClient } from '@/lib/supabase/client';
import { Enums } from '@/database.types';
import type {
  AnnouncementFilterCriteria,
  ApplicationFilterCriteria,
  StudentFilterCriteria,
} from '@/types/announcementFilters';

/**
 * Compute recipient IDs based on filter criteria.
 * @param criteria Filter criteria structure
 * @param rtoId RTO ID for tenant isolation
 * @returns Object with studentIds and applicationIds arrays
 */
export async function computeRecipients(
  criteria: AnnouncementFilterCriteria,
  rtoId: string
): Promise<{ studentIds: string[]; applicationIds: string[] }> {
  if (criteria.recipientType === 'students') {
    const studentIds = await computeStudentRecipients(
      criteria.filters as StudentFilterCriteria,
      rtoId
    );
    return { studentIds, applicationIds: [] };
  } else {
    const applicationIds = await computeApplicationRecipients(
      criteria.filters as ApplicationFilterCriteria,
      rtoId
    );
    return { studentIds: [], applicationIds };
  }
}

/**
 * Compute student recipient IDs based on filter criteria.
 */
async function computeStudentRecipients(
  filters: StudentFilterCriteria,
  rtoId: string
): Promise<string[]> {
  const supabase = createClient();

  let query = supabase.from('students').select('id').eq('rto_id', rtoId);

  // Filter by program IDs (via enrollments)
  if (filters.programIds?.length) {
    // Get student IDs that have enrollments with the specified programs
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('rto_id', rtoId)
      .in('program_id', filters.programIds);

    if (enrollError) {
      throw new Error(`Failed to fetch enrollments: ${enrollError.message}`);
    }

    const studentIdsFromEnrollments =
      enrollments?.map((e) => e.student_id) ?? [];
    if (studentIdsFromEnrollments.length === 0) {
      return []; // No students match the program filter
    }
    query = query.in('id', studentIdsFromEnrollments);
  }

  // Filter by statuses
  if (filters.statuses?.length) {
    query = query.in('status', filters.statuses as Enums<'student_status'>[]);
  }

  // Filter by created date range
  if (filters.createdAtRange?.from) {
    query = query.gte('created_at', filters.createdAtRange.from);
  }
  if (filters.createdAtRange?.to) {
    query = query.lte('created_at', filters.createdAtRange.to);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to compute student recipients: ${error.message}`);
  }

  return data?.map((s) => s.id) ?? [];
}

/**
 * Compute application recipient IDs based on filter criteria.
 */
async function computeApplicationRecipients(
  filters: ApplicationFilterCriteria,
  rtoId: string
): Promise<string[]> {
  const supabase = createClient();

  let query = supabase.from('applications').select('id').eq('rto_id', rtoId);

  // Filter by agent IDs
  if (filters.agentIds?.length) {
    query = query.in('agent_id', filters.agentIds);
  }

  // Filter by program IDs
  if (filters.programIds?.length) {
    query = query.in('program_id', filters.programIds);
  }

  // Filter by statuses
  if (filters.statuses?.length) {
    query = query.in(
      'status',
      filters.statuses as Enums<'application_status'>[]
    );
  }

  // Filter by international flag
  if (filters.isInternational !== undefined) {
    query = query.eq('is_international', filters.isInternational);
  }

  // Filter by assigned to
  if (filters.assignedToIds?.length) {
    query = query.in('assigned_to', filters.assignedToIds);
  }

  // Filter by date range
  if (filters.dateRange?.from) {
    query = query.gte('created_at', filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = query.lte('created_at', filters.dateRange.to);
  }

  // Filter by created date range
  if (filters.createdAtRange?.from) {
    query = query.gte('created_at', filters.createdAtRange.from);
  }
  if (filters.createdAtRange?.to) {
    query = query.lte('created_at', filters.createdAtRange.to);
  }

  // Filter by payment plan template
  if (filters.hasPaymentPlanTemplate === 'yes') {
    query = query.not('payment_plan_template_id', 'is', null);
  } else if (filters.hasPaymentPlanTemplate === 'no') {
    query = query.is('payment_plan_template_id', null);
  }

  // Filter by timetable
  if (filters.hasTimetable === 'yes') {
    query = query.not('timetable_id', 'is', null);
  } else if (filters.hasTimetable === 'no') {
    query = query.is('timetable_id', null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Failed to compute application recipients: ${error.message}`
    );
  }

  return data?.map((a) => a.id) ?? [];
}

/**
 * Compute recipient count for preview (without fetching all IDs).
 * More efficient for UI preview.
 */
export async function computeRecipientCount(
  criteria: AnnouncementFilterCriteria,
  rtoId: string
): Promise<number> {
  if (criteria.recipientType === 'students') {
    return await computeStudentRecipientCount(
      criteria.filters as StudentFilterCriteria,
      rtoId
    );
  } else {
    return await computeApplicationRecipientCount(
      criteria.filters as ApplicationFilterCriteria,
      rtoId
    );
  }
}

/**
 * Compute student recipient count.
 */
async function computeStudentRecipientCount(
  filters: StudentFilterCriteria,
  rtoId: string
): Promise<number> {
  const supabase = createClient();

  let query = supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('rto_id', rtoId);

  // Filter by program IDs (via enrollments)
  if (filters.programIds?.length) {
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('rto_id', rtoId)
      .in('program_id', filters.programIds);

    if (enrollError) {
      throw new Error(`Failed to fetch enrollments: ${enrollError.message}`);
    }

    const studentIdsFromEnrollments =
      enrollments?.map((e) => e.student_id) ?? [];
    if (studentIdsFromEnrollments.length === 0) {
      return 0;
    }
    query = query.in('id', studentIdsFromEnrollments);
  }

  // Filter by statuses
  if (filters.statuses?.length) {
    query = query.in('status', filters.statuses as Enums<'student_status'>[]);
  }

  // Filter by created date range
  if (filters.createdAtRange?.from) {
    query = query.gte('created_at', filters.createdAtRange.from);
  }
  if (filters.createdAtRange?.to) {
    query = query.lte('created_at', filters.createdAtRange.to);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(
      `Failed to compute student recipient count: ${error.message}`
    );
  }

  return count ?? 0;
}

/**
 * Compute application recipient count.
 */
async function computeApplicationRecipientCount(
  filters: ApplicationFilterCriteria,
  rtoId: string
): Promise<number> {
  const supabase = createClient();

  let query = supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('rto_id', rtoId);

  // Filter by agent IDs
  if (filters.agentIds?.length) {
    query = query.in('agent_id', filters.agentIds);
  }

  // Filter by program IDs
  if (filters.programIds?.length) {
    query = query.in('program_id', filters.programIds);
  }

  // Filter by statuses
  if (filters.statuses?.length) {
    query = query.in(
      'status',
      filters.statuses as Enums<'application_status'>[]
    );
  }

  // Filter by international flag
  if (filters.isInternational !== undefined) {
    query = query.eq('is_international', filters.isInternational);
  }

  // Filter by assigned to
  if (filters.assignedToIds?.length) {
    query = query.in('assigned_to', filters.assignedToIds);
  }

  // Filter by date range
  if (filters.dateRange?.from) {
    query = query.gte('created_at', filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = query.lte('created_at', filters.dateRange.to);
  }

  // Filter by created date range
  if (filters.createdAtRange?.from) {
    query = query.gte('created_at', filters.createdAtRange.from);
  }
  if (filters.createdAtRange?.to) {
    query = query.lte('created_at', filters.createdAtRange.to);
  }

  // Filter by payment plan template
  if (filters.hasPaymentPlanTemplate === 'yes') {
    query = query.not('payment_plan_template_id', 'is', null);
  } else if (filters.hasPaymentPlanTemplate === 'no') {
    query = query.is('payment_plan_template_id', null);
  }

  // Filter by timetable
  if (filters.hasTimetable === 'yes') {
    query = query.not('timetable_id', 'is', null);
  } else if (filters.hasTimetable === 'no') {
    query = query.is('timetable_id', null);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(
      `Failed to compute application recipient count: ${error.message}`
    );
  }

  return count ?? 0;
}
