import { z } from 'zod';

// NAT00080: Client. Mandatory fields per AVETMISS.
export const applicationSchema = z.object({
  // Personal Identity
  salutation: z.string().optional(),
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Last name is required'),
  preferred_name: z.string().optional(),
  // NAT00080: Date of birth in DB as Date, captured via date picker (accept Date for server parse)
  date_of_birth: z.union([
    z.string().min(1, 'Date of birth is required'),
    z.date(),
  ]),

  // Program Selection
  program_id: z.string().min(1, 'Program selection is required'),
  // Program Plan Selection
  program_plan_id: z.string().min(1, 'Program plan selection is required'),
  // Commencement Date
  proposed_commencement_date: z.string().optional(),

  // Payment Plan
  payment_plan_template_id: z.string().optional(),
  payment_anchor_date: z.string().optional(),

  // Agent
  agent_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal('none').transform(() => undefined)),

  // Contact
  email: z
    .string()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  work_phone: z.string().optional(),
  mobile_phone: z.string().optional(),
  alternative_email: z
    .string()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),

  // Legacy simple address (still present in DB for backward compatibility)
  address_line_1: z.string().optional().or(z.literal('')),
  suburb: z.string().min(1, 'Suburb is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z.string().min(1, 'Postcode is required'),

  // Structured Street Address
  street_building_name: z.string().optional(),
  street_unit_details: z.string().optional(),
  street_number_name: z.string().optional(),
  street_po_box: z.string().optional(),
  street_country: z.string().optional(),

  // Postal Address
  postal_is_same_as_street: z.boolean().default(false),
  postal_building_name: z.string().optional(),
  postal_unit_details: z.string().optional(),
  postal_number_name: z.string().optional(),
  postal_po_box: z.string().optional(),
  postal_suburb: z.string().optional(),
  postal_state: z.string().optional(),
  postal_postcode: z.string().optional(),
  postal_country: z.string().optional(),

  // AVETMISS Core
  gender: z.string().min(1, 'Gender is required'), // NAT00080
  highest_school_level_id: z
    .string()
    .min(1, 'Highest school level is required'),
  indigenous_status_id: z.string().min(1, 'Indigenous status is required'),
  labour_force_status_id: z.string().min(1, 'Labour force status is required'),
  country_of_birth_id: z.string().min(1, 'Country of birth is required'),
  language_code: z.string().min(1, 'Language is required'),
  citizenship_status_code: z.string().min(1, 'Citizenship status is required'),
  at_school_flag: z.string().min(1, 'At school flag is required'),

  // International (CRICOS)
  is_international: z.boolean(),
  usi: z.string().optional(),
  passport_number: z.string().optional(),
  visa_type: z.string().optional(),
  visa_number: z.string().optional(),
  country_of_citizenship: z.string().optional(),
  ielts_score: z.string().optional(),

  // Embedded Emergency Contact
  ec_name: z.string().optional(),
  ec_relationship: z.string().optional(),
  ec_phone_number: z.string().optional(),

  // Embedded Parent/Guardian
  g_name: z.string().optional(),
  g_email: z
    .string()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  g_phone_number: z.string().optional(),
});

// Schema for draft saving (allows empty strings for optional fields, validates format only)
export const draftApplicationSchema = z.object({
  salutation: z.string().optional(),
  first_name: z.string().optional(),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  preferred_name: z.string().optional(),
  date_of_birth: z.union([z.string(), z.date()]).optional(),
  program_id: z.string().optional(),
  program_plan_id: z.string().optional(),
  proposed_commencement_date: z.string().optional(),
  payment_plan_template_id: z.string().optional(),
  payment_anchor_date: z.string().optional(),
  agent_id: z.string().optional(),
  email: z
    .string()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  work_phone: z.string().optional(),
  mobile_phone: z.string().optional(),
  alternative_email: z
    .string()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  address_line_1: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  street_building_name: z.string().optional(),
  street_unit_details: z.string().optional(),
  street_number_name: z.string().optional(),
  street_po_box: z.string().optional(),
  street_country: z.string().optional(),
  postal_is_same_as_street: z.boolean().optional(),
  postal_building_name: z.string().optional(),
  postal_unit_details: z.string().optional(),
  postal_number_name: z.string().optional(),
  postal_po_box: z.string().optional(),
  postal_suburb: z.string().optional(),
  postal_state: z.string().optional(),
  postal_postcode: z.string().optional(),
  postal_country: z.string().optional(),
  gender: z.string().optional(),
  highest_school_level_id: z.string().optional(),
  indigenous_status_id: z.string().optional(),
  labour_force_status_id: z.string().optional(),
  country_of_birth_id: z.string().optional(),
  language_code: z.string().optional(),
  citizenship_status_code: z.string().optional(),
  at_school_flag: z.string().optional(),
  is_international: z.boolean().optional(),
  usi: z.string().optional(),
  passport_number: z.string().optional(),
  visa_type: z.string().optional(),
  visa_number: z.string().optional(),
  country_of_citizenship: z.string().optional(),
  ielts_score: z.string().optional(),
  ec_name: z.string().optional(),
  ec_relationship: z.string().optional(),
  ec_phone_number: z.string().optional(),
  g_name: z.string().optional(),
  g_email: z
    .string()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  g_phone_number: z.string().optional(),
});

export type ApplicationFormValues = z.infer<typeof applicationSchema>;
