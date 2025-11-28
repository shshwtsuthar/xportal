/**
 * Type definitions for announcement recipient filtering system.
 * Uses JSONB structure for flexible, extensible filtering.
 */

export type RecipientType = 'students' | 'applications';

/**
 * Filter criteria for applications
 */
export interface ApplicationFilterCriteria {
  agentIds?: string[];
  programIds?: string[];
  statuses?: string[];
  isInternational?: boolean;
  dateRange?: { from?: string; to?: string };
  createdAtRange?: { from?: string; to?: string };
  assignedToIds?: string[];
  hasPaymentPlanTemplate?: 'yes' | 'no';
  hasTimetable?: 'yes' | 'no';
}

/**
 * Filter criteria for students
 */
export interface StudentFilterCriteria {
  programIds?: string[]; // via enrollments
  statuses?: string[];
  createdAtRange?: { from?: string; to?: string };
}

/**
 * Complete filter criteria structure stored in JSONB
 */
export interface AnnouncementFilterCriteria {
  recipientType: RecipientType;
  filters: ApplicationFilterCriteria | StudentFilterCriteria;
}

/**
 * Medium selection type
 */
export type AnnouncementMedium = 'announcement' | 'sms' | 'mail' | 'whatsapp';
