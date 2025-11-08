import { z } from 'zod';

// NAT00080: Client. Mandatory fields per AVETMISS.
export const applicationSchema = z
  .object({
    // Personal Identity
    salutation: z.string().optional(),
    first_name: z.string().min(1, 'First name is required'),
    middle_name: z.string().optional(),
    last_name: z.string().min(1, 'Last name is required'),
    preferred_name: z.string().optional(),
    // NAT00080: Date of birth in DB as Date, captured via date picker (accept Date for server parse)
    // Format: DDMMYYYY (exactly 8 numeric characters)
    // Type: D (Date field), right-justified, zero-filled
    // Example: "05031995" for March 5, 1995
    date_of_birth: z
      .union([z.string().min(1, 'Date of birth is required'), z.date()])
      .refine(
        (val) => {
          if (!val) return false;

          let date: Date;
          if (typeof val === 'string') {
            // Parse ISO string (YYYY-MM-DD) or other formats
            date = new Date(val);
          } else {
            date = val;
          }

          // Check if date is valid
          if (isNaN(date.getTime())) return false;

          // Extract components
          const day = date.getDate();
          const month = date.getMonth() + 1; // getMonth() returns 0-11
          const year = date.getFullYear();

          // Validate DD is 01-31
          if (day < 1 || day > 31) return false;

          // Validate MM is 01-12
          if (month < 1 || month > 12) return false;

          // Validate YYYY is valid year (typically 1900-current year)
          const currentYear = new Date().getFullYear();
          if (year < 1900 || year > currentYear) return false;

          // Validate it's a valid calendar date (e.g., 31/02/2020 is invalid)
          // Check if the date components match the actual date
          const checkDate = new Date(year, month - 1, day);
          if (
            checkDate.getDate() !== day ||
            checkDate.getMonth() !== month - 1 ||
            checkDate.getFullYear() !== year
          ) {
            return false;
          }

          // Validate student is at least 15 years old
          const today = new Date();
          let age = today.getFullYear() - year;
          const monthDiff = today.getMonth() - (month - 1);
          const dayDiff = today.getDate() - day;

          if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            age--;
          }

          return age >= 15;
        },
        {
          message:
            'Date of birth must be valid and student must be at least 15 years old',
        }
      ),

    // Program Selection
    program_id: z.string().min(1, 'Program selection is required'),
    // Timetable Selection
    timetable_id: z.string().min(1, 'Timetable selection is required'),
    // Commencement Date
    proposed_commencement_date: z
      .string()
      .min(1, 'Commencement date is required'),

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
    // NAT00080: Year highest school level completed (conditional)
    year_highest_school_level_completed: z
      .string()
      .refine(
        (val) => val === '@@' || /^[0-9]{2}$/.test(val),
        'Must be a 2-digit year or @@'
      )
      .optional(),
    indigenous_status_id: z.string().min(1, 'Indigenous status is required'),
    labour_force_status_id: z
      .string()
      .min(1, 'Labour force status is required'),
    country_of_birth_id: z.string().min(1, 'Country of birth is required'),
    language_code: z.string().min(1, 'Language is required'),
    citizenship_status_code: z
      .string()
      .min(1, 'Citizenship status is required'),
    at_school_flag: z.string().min(1, 'At school flag is required'),
    // NAT00080: Survey contact status (auto-calculated, default 'A')
    survey_contact_status: z
      .enum(['A', 'C', 'D', 'E', 'I', 'M', 'O'], {
        message: 'Invalid survey contact status',
      })
      .default('A'),
    // NAT00080: Victorian Student Number (conditional)
    vsn: z
      .string()
      .refine(
        (val) => !val || val === '000000000' || /^[0-9]{9}$/.test(val),
        'Must be 9 digits or 000000000'
      )
      .optional()
      .or(z.literal('')),

    // International (CRICOS)
    is_international: z.boolean(),
    // NAT00080: USI - required for domestic students
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
  })
  .refine(
    (data) => {
      // Year field: required if highest_school_level_id is not "02" (Did not go to school)
      if (
        data.highest_school_level_id &&
        data.highest_school_level_id !== '02'
      ) {
        return !!data.year_highest_school_level_completed;
      }
      return true;
    },
    {
      message: 'Year highest school level completed is required',
      path: ['year_highest_school_level_completed'],
    }
  )
  .refine(
    (data) => {
      // USI: required for domestic students
      if (data.is_international === false) {
        return !!data.usi && data.usi.trim().length > 0;
      }
      return true;
    },
    {
      message: 'USI is required for domestic students',
      path: ['usi'],
    }
  );

// Schema for draft saving (allows empty strings for optional fields, validates format only)
export const draftApplicationSchema = z.object({
  salutation: z.string().optional(),
  first_name: z.string().optional(),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  preferred_name: z.string().optional(),
  date_of_birth: z
    .union([z.string(), z.date()])
    .optional()
    .refine(
      (val) => {
        if (!val) return true; // Optional field, allow empty

        let date: Date;
        if (typeof val === 'string') {
          date = new Date(val);
        } else {
          date = val;
        }

        // Check if date is valid
        if (isNaN(date.getTime())) return false;

        // Extract components
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        // Validate DD is 01-31
        if (day < 1 || day > 31) return false;

        // Validate MM is 01-12
        if (month < 1 || month > 12) return false;

        // Validate YYYY is valid year (typically 1900-current year)
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear) return false;

        // Validate it's a valid calendar date
        const checkDate = new Date(year, month - 1, day);
        if (
          checkDate.getDate() !== day ||
          checkDate.getMonth() !== month - 1 ||
          checkDate.getFullYear() !== year
        ) {
          return false;
        }

        // Validate student is at least 15 years old
        const today = new Date();
        let age = today.getFullYear() - year;
        const monthDiff = today.getMonth() - (month - 1);
        const dayDiff = today.getDate() - day;

        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
          age--;
        }

        return age >= 15;
      },
      {
        message:
          'Date of birth must be valid and student must be at least 15 years old',
      }
    ),
  program_id: z.string().optional(),
  timetable_id: z.string().optional(),
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
  year_highest_school_level_completed: z.string().optional(),
  survey_contact_status: z.string().optional(),
  vsn: z.string().optional(),
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
