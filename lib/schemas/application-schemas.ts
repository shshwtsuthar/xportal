import { z } from 'zod';

// =============================================================================
// BACKEND-FIRST VALIDATION SCHEMAS
// These schemas exactly match our OpenAPI specification to ensure 100% compatibility
// =============================================================================

// Address Schema - matches openapi.yaml Address component
export const AddressSchema = z.object({
  streetNumber: z.string().min(1, "Street number is required"),
  streetName: z.string().min(1, "Street name is required"),
  unitDetails: z.string().nullable().optional(),
  buildingName: z.string().nullable().optional(),
  suburb: z.string().min(1, "Suburb is required"),
  state: z.enum(['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']),
  postcode: z.string().regex(/^\d{4}$/, "Postcode must be 4 digits"),
});

// Client Personal Details Schema - matches openapi.yaml ClientPersonalDetails
export const ClientPersonalDetailsSchema = z.object({
  title: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().refine((date) => {
    const parsed = new Date(date);
    const today = new Date();
    return parsed <= today;
  }, "Date of birth cannot be in the future"),
  gender: z.enum(['Male', 'Female', 'Other']),
  primaryEmail: z.string().email("Invalid email address"),
  primaryPhone: z.string().min(10, "Phone number must be at least 10 digits"),
});

// Client Address Schema - matches openapi.yaml ClientAddress
export const ClientAddressSchema = z.object({
  residential: AddressSchema,
  isPostalSameAsResidential: z.boolean().default(true),
  postal: AddressSchema.optional(),
}).refine((data) => {
  // If postal is not same as residential, postal address is required
  if (!data.isPostalSameAsResidential && !data.postal) {
    return false;
  }
  return true;
}, {
  message: "Postal address is required when different from residential address",
  path: ["postal"]
});

// Emergency Contact Schema (for Step 1)
export const EmergencyContactSchema = z.object({
  name: z.string().min(1, "Emergency contact name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address").optional(),
});

// AVETMISS Details Schema - matches openapi.yaml ClientAvetmissDetails
export const ClientAvetmissDetailsSchema = z.object({
  countryOfBirthId: z.string().min(1, "Country of birth is required"),
  languageAtHomeId: z.string().min(1, "Language at home is required"),
  indigenousStatusId: z.string().min(1, "Indigenous status is required"),
  highestSchoolLevelId: z.string().min(1, "Highest school level is required"),
  isAtSchool: z.boolean().default(false),
  hasDisability: z.boolean().default(false),
  disabilityTypeIds: z.array(z.string()).default([]),
  hasPriorEducation: z.boolean().default(false),
  priorEducationCodes: z.array(z.string()).default([]),
  labourForceId: z.string().min(1, "Labour force status is required"),
  surveyContactStatus: z.string().nullable().optional(),
});

// Step 1 Schema - Personal Information (matches backend expectations)
export const Step1PersonalInfoSchema = z.object({
  personalDetails: ClientPersonalDetailsSchema,
  address: ClientAddressSchema,
  emergencyContact: EmergencyContactSchema,
});

// Enrolment Details Schema - matches openapi.yaml EnrolmentDetails
// NOTE: Our seed uses deterministic UUID-like IDs that are not RFC version 4.
// Zod's .uuid() validates v4. We accept any hyphenated 8-4-4-4-12 hex format instead.
const UuidLike = z.string().regex(/^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/,
  "Invalid ID format");

export const EnrolmentDetailsSchema = z.object({
  programId: UuidLike,
  programPlanTemplateId: UuidLike, // Required: Program plan template selection
  courseOfferingId: UuidLike.optional(), // Made optional for rolling intakes
  intakeModel: z.enum(['Fixed', 'Rolling']).optional(), // New: Intake model selection
  subjectStructure: z.object({
    coreSubjectIds: z.array(UuidLike).min(1, "At least one core subject must be selected"),
    electiveSubjectIds: z.array(UuidLike).default([]),
  }),
  startDate: z.string().optional(), // Made optional for rolling intakes
  expectedCompletionDate: z.string().optional(), // Made optional for rolling intakes
  deliveryLocationId: z.string().trim().toLowerCase().regex(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/,
    "Invalid delivery location ID"),
  deliveryModeId: z.string().min(1, "Delivery mode is required"),
  fundingSourceId: z.string().min(1, "Funding source is required"),
  studyReasonId: z.string().min(1, "Study reason is required"),
  isVetInSchools: z.boolean().default(false),
}).refine((data) => {
  // For Fixed intake, courseOfferingId and dates are required
  if (data.intakeModel === 'Fixed') {
    return data.courseOfferingId && data.startDate && data.expectedCompletionDate;
  }
  // For Rolling intake, programPlanTemplateId is required, dates are optional
  if (data.intakeModel === 'Rolling') {
    return data.programPlanTemplateId;
  }
  return true;
}, {
  message: "Invalid intake model configuration",
  path: ["intakeModel"]
});

// Step 2 Schema - Academic Information (matches backend expectations)
export const Step2AcademicInfoSchema = z.object({
  avetmissDetails: ClientAvetmissDetailsSchema,
});

// Agent and Referral Schema - for Step 4
export const AgentReferralSchema = z.object({
  agentId: z.string().uuid("Invalid agent ID").nullable().optional(),
  referralSource: z.string().min(1, "Referral source is required").optional(),
  marketingAttribution: z.string().optional(),
  referralNotes: z.string().optional(),
});

// Step 3 Schema - Program Selection (matches backend expectations)
export const Step3ProgramSelectionSchema = z.object({
  enrolmentDetails: EnrolmentDetailsSchema,
});

// Financial Arrangements Schema - for Step 5
export const FinancialArrangementsSchema = z.object({
  paymentPlan: z.enum(['full-upfront', 'installments', 'deferred']),
  tuitionFeeSnapshot: z.number().min(0, "Tuition fee must be positive"),
  agentCommissionRateSnapshot: z.number().min(0).max(100, "Commission rate must be between 0 and 100").optional(),
  paymentMethod: z.enum(['credit-card', 'bank-transfer', 'cash', 'other']),
  installmentCount: z.number().min(1).max(12).optional(),
  installmentAmount: z.number().min(0).optional(),
  paymentSchedule: z.array(z.object({
    dueDate: z.string(),
    amount: z.number(),
    status: z.enum(['pending', 'paid', 'overdue']).default('pending'),
  })).optional(),
  specialArrangements: z.string().optional(),
  financialNotes: z.string().optional(),
});

// Step 4 Schema - Agent & Referral (matches backend expectations)
export const Step4AgentReferralSchema = z.object({
  agentReferral: AgentReferralSchema,
});

// Step 5 Schema - Financial Arrangements (matches backend expectations)
export const Step5FinancialArrangementsSchema = z.object({
  financialArrangements: FinancialArrangementsSchema,
});

// Full Enrolment Payload Schema - matches openapi.yaml FullEnrolmentPayload
export const FullEnrolmentPayloadSchema = z.object({
  existingClientId: z.string().uuid().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
  isInternationalStudent: z.boolean().default(false),
  personalDetails: ClientPersonalDetailsSchema,
  address: ClientAddressSchema,
  avetmissDetails: ClientAvetmissDetailsSchema.optional(), // Step 2
  cricosDetails: z.object({}).optional(), // Will be defined in Step 2
  usi: z.object({}).optional(), // Will be defined in Step 2
  enrolmentDetails: EnrolmentDetailsSchema.optional(), // Step 3
});

// Type exports for TypeScript
export type Address = z.infer<typeof AddressSchema>;
export type ClientPersonalDetails = z.infer<typeof ClientPersonalDetailsSchema>;
export type ClientAddress = z.infer<typeof ClientAddressSchema>;
export type EmergencyContact = z.infer<typeof EmergencyContactSchema>;
export type ClientAvetmissDetails = z.infer<typeof ClientAvetmissDetailsSchema>;
export type EnrolmentDetails = z.infer<typeof EnrolmentDetailsSchema>;
export type AgentReferral = z.infer<typeof AgentReferralSchema>;
export type FinancialArrangements = z.infer<typeof FinancialArrangementsSchema>;
export type Step1PersonalInfo = z.infer<typeof Step1PersonalInfoSchema>;
export type Step2AcademicInfo = z.infer<typeof Step2AcademicInfoSchema>;
export type Step3ProgramSelection = z.infer<typeof Step3ProgramSelectionSchema>;
export type Step4AgentReferral = z.infer<typeof Step4AgentReferralSchema>;
export type Step5FinancialArrangements = z.infer<typeof Step5FinancialArrangementsSchema>;
export type FullEnrolmentPayload = z.infer<typeof FullEnrolmentPayloadSchema>;

// Validation helper functions
export const validateStep1 = (data: unknown): { success: boolean; data?: Step1PersonalInfo; errors?: any } => {
  try {
    const result = Step1PersonalInfoSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten() };
    }
    return { success: false, errors: { fieldErrors: {}, formErrors: ['Unknown validation error'] } };
  }
};

export const validateStep2 = (data: unknown): { success: boolean; data?: Step2AcademicInfo; errors?: any } => {
  try {
    const result = Step2AcademicInfoSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten() };
    }
    return { success: false, errors: { fieldErrors: {}, formErrors: ['Unknown validation error'] } };
  }
};

export const validateStep3 = (data: unknown): { success: boolean; data?: Step3ProgramSelection; errors?: any } => {
  try {
    const result = Step3ProgramSelectionSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten() };
    }
    return { success: false, errors: { fieldErrors: {}, formErrors: ['Unknown validation error'] } };
  }
};

export const validateStep4 = (data: unknown): { success: boolean; data?: Step4AgentReferral; errors?: any } => {
  try {
    const result = Step4AgentReferralSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten() };
    }
    return { success: false, errors: { fieldErrors: {}, formErrors: ['Unknown validation error'] } };
  }
};

export const validateStep5 = (data: unknown): { success: boolean; data?: Step5FinancialArrangements; errors?: any } => {
  try {
    const result = Step5FinancialArrangementsSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten() };
    }
    return { success: false, errors: { fieldErrors: {}, formErrors: ['Unknown validation error'] } };
  }
};

export const validateFullPayload = (data: unknown): { success: boolean; data?: FullEnrolmentPayload; errors?: any } => {
  try {
    const result = FullEnrolmentPayloadSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten() };
    }
    return { success: false, errors: { fieldErrors: {}, formErrors: ['Unknown validation error'] } };
  }
};
