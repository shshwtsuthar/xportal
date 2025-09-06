// =============================================================================
// FILE:        validators.ts (v2 - Type Safe)
// PROJECT:     XPortal Student Management System (SMS)
// AUTHOR:      Lead Backend Engineer
//
// DESCRIPTION:
// This version resolves all circular type inference errors by adopting a
// two-stage schema definition pattern. Base schemas are defined first, then
// refined, breaking the circular dependency and satisfying the TypeScript
// compiler. This is the definitive, fully type-safe implementation.
// =============================================================================

import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { ValidationError } from './errors.ts';

// --- Reusable Base Schemas ---

// ENHANCED: Now includes granular AVETMISS address fields.
const AddressSchema = z.object({
  building_property_name: z.string().optional().nullable(),
  flat_unit_details: z.string().optional().nullable(),
  street_number: z.string().optional().nullable(),
  street_name: z.string().optional().nullable(),
  suburb: z.string().min(1, { message: 'Suburb is required.' }),
  state: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']),
  postcode: z.string().regex(/^\d{4}$/, 'Postcode must be a valid 4-digit number.'),
  sa1_identifier: z.string().optional().nullable(),
  sa2_identifier: z.string().optional().nullable(),
});

const ClientPersonalDetailsSchema = z.object({
  title: z.string().optional().nullable(),
  firstName: z.string().min(1, { message: 'First name is required.' }),
  lastName: z.string().min(1, { message: 'Last name is required.' }),
  dateOfBirth: z.coerce.date().max(new Date(), { message: 'Date of birth cannot be in the future.' }),
  gender: z.string().min(1, { message: 'Gender is required.' }),
  primaryEmail: z.string().email({ message: 'A valid primary email is required.' }),
  alternativeEmail: z.string().email().optional().nullable(),
  mobilePhone: z.string().min(1, { message: 'Mobile phone is required.' }),
  homePhone: z.string().optional().nullable(),
  workPhone: z.string().optional().nullable(),
});

// CORRECTED PATTERN: Stage 1 - Define the base object.
const ClientUSIBaseSchema = z.object({
  usi: z.string().regex(/^[A-HJ-NP-Z2-9]{10}$/, 'Invalid USI format.').optional().nullable(),
  exemptionCode: z.string().optional().nullable(),
});
// CORRECTED PATTERN: Stage 2 - Refine the base object.
const ClientUSISchema = ClientUSIBaseSchema.superRefine((data, ctx) => {
  if (!data.usi && !data.exemptionCode) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['usi'], message: 'Either a USI or a USI exemption code must be provided.' });
  }
  if (data.usi && data.exemptionCode) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['usi'], message: 'Cannot provide both a USI and an exemption code.' });
  }
});

// ENHANCED: Now includes the survey contact status.
const ClientAvetmissDetailsBaseSchema = z.object({
  countryOfBirthId: z.string().min(1, { message: 'Country of birth is required.' }),
  languageAtHomeId: z.string().min(1, { message: 'Language spoken at home is required.' }),
  indigenousStatusId: z.string().min(1, { message: 'Indigenous status is required.' }),
  highestSchoolLevelId: z.string().min(1, { message: 'Highest completed school level is required.' }),
  isAtSchool: z.boolean(),
  hasDisability: z.boolean(),
  disabilityTypeIds: z.array(z.string()),
  hasPriorEducation: z.boolean(),
  priorEducationCodes: z.array(z.string()),
  labourForceId: z.string().min(1, { message: 'Labour force status is required.' }),
  // New Field:
  survey_contact_status: z.string().optional().nullable(),
});
// CORRECTED PATTERN: Stage 2
const ClientAvetmissDetailsSchema = ClientAvetmissDetailsBaseSchema.superRefine((data, ctx) => {
  if (data.hasDisability && data.disabilityTypeIds.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['disabilityTypeIds'], message: 'At least one disability type must be selected if "Has Disability" is checked.' });
  }
  if (data.hasPriorEducation && data.priorEducationCodes.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priorEducationCodes'], message: 'At least one prior education achievement must be selected if "Has Prior Education" is checked.' });
  }
});

const ClientCricosDetailsSchema = z.object({
  countryOfCitizenshipId: z.string().min(1, { message: 'Country of citizenship is required.' }),
  passportNumber: z.string().min(1, { message: 'Passport number is required.' }),
  passportExpiryDate: z.coerce.date().min(new Date(), { message: 'Passport must not be expired.' }),
});

const EnrolmentDetailsSchema = z.object({
  programId: z.string().uuid({ message: 'A valid program must be selected.' }),
  courseOfferingId: z.string().uuid({ message: 'A valid course offering must be selected.' }),
  subjectStructure: z.object({
    coreSubjectIds: z.array(z.string().uuid()),
    electiveSubjectIds: z.array(z.string().uuid()),
  }),
  startDate: z.coerce.date(),
  expectedCompletionDate: z.coerce.date(),
  deliveryLocationId: z.string().uuid({ message: 'A valid delivery location must be selected.' }),
  deliveryModeId: z.string().min(1, { message: 'Delivery mode is required.' }),
  fundingSourceId: z.string().min(1, { message: 'Funding source is required.' }),
  studyReasonId: z.string().min(1, { message: 'Study reason is required.' }),
  // New Fields:
  vet_in_schools_flag: z.boolean().default(false),
  school_type_identifier: z.string().optional().nullable(),
  training_contract_identifier: z.string().optional().nullable(),
  client_identifier_apprenticeships: z.string().optional().nullable(),
  specific_funding_identifier: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.startDate >= data.expectedCompletionDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expectedCompletionDate'], message: 'Expected completion date must be after the start date.' });
  }
});

// --- Master Payload Schema ---

// CORRECTED PATTERN: Stage 1
const ClientAddressBlockBaseSchema = z.object({
    residential: AddressSchema,
    isPostalSameAsResidential: z.boolean().default(true),
    postal: AddressSchema.optional(),
});
// CORRECTED PATTERN: Stage 2
const ClientAddressBlockSchema = ClientAddressBlockBaseSchema.superRefine((data, ctx) => {
    if (!data.isPostalSameAsResidential && !data.postal) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['postal'], message: 'Postal address is required when it is not the same as the residential address.' });
    }
});

// CORRECTED PATTERN: Stage 1
const FullEnrolmentPayloadBaseSchema = z.object({
  existingClientId: z.string().uuid().optional().nullable(),
  agentId: z.string().uuid().optional().nullable(),
  isInternationalStudent: z.boolean(),
  personalDetails: ClientPersonalDetailsSchema,
  address: ClientAddressBlockSchema,
  avetmissDetails: ClientAvetmissDetailsSchema,
  cricosDetails: ClientCricosDetailsSchema.optional(),
  usi: ClientUSISchema,
  enrolmentDetails: EnrolmentDetailsSchema,
});
// CORRECTED PATTERN: Stage 2
export const FullEnrolmentPayloadSchema = FullEnrolmentPayloadBaseSchema.superRefine((data, ctx) => {
  if (data.isInternationalStudent && !data.cricosDetails) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cricosDetails'], message: 'CRICOS details are mandatory for international students.' });
  }
});

// --- Exported Type and Validation Function ---

export type FullEnrolmentPayload = z.infer<typeof FullEnrolmentPayloadSchema>;

export const validateFullEnrolmentPayload = (payload: unknown): FullEnrolmentPayload => {
  const result = FullEnrolmentPayloadSchema.safeParse(payload);
  if (!result.success) {
    const formattedErrors = result.error.flatten().fieldErrors;
    const errorMessage = "Payload validation failed. Please review the highlighted fields.";
    console.error(errorMessage, formattedErrors);
    throw new ValidationError(errorMessage, formattedErrors);
  }
  return result.data;
};