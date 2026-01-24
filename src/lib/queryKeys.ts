/**
 * Centralized query key constants for React Query.
 * This ensures consistency across all hooks and prevents typos.
 */

export const queryKeys = {
  // Applications
  application: (id: string) => ['application', id] as const,
  applications: () => ['applications'] as const,
  applicationWithAgent: (id: string) => ['application_with_agent', id] as const,

  // Application Relations
  applicationDisabilities: (applicationId: string) =>
    ['application_disabilities', applicationId] as const,
  applicationPriorEducation: (applicationId: string) =>
    ['application_prior_education', applicationId] as const,
  applicationLearningPlan: (applicationId: string) =>
    ['application_learning_plan', applicationId] as const,
  applicationPaymentSchedule: (applicationId: string) =>
    ['application_payment_schedule', applicationId] as const,

  // Programs
  programs: () => ['programs'] as const,
  program: (id: string) => ['program', id] as const,

  // Timetables
  timetables: () => ['timetables'] as const,
  timetablesByGroupAndLocation: (
    programId?: string,
    groupId?: string,
    locationId?: string
  ) => ['timetables', programId, groupId, locationId] as const,

  // Groups
  groups: () => ['groups'] as const,
  groupsByLocation: (programId?: string, locationId?: string) =>
    ['groups', programId, locationId] as const,

  // Locations
  locations: () => ['locations'] as const,
  location: (id: string) => ['location', id] as const,

  // Payment Plans
  paymentPlanTemplates: (programId?: string) =>
    ['payment_plan_templates', programId] as const,
  templateInstallments: (templateId?: string) =>
    ['template_installments', templateId] as const,
} as const;
