import { z } from 'zod';
// Import USI validator
// Uses @/ alias which works in both Next.js (via tsconfig.json) and Deno (via deno.json import map)
// Deno will resolve @/lib/utils/usiValidator to ../../../lib/utils/usiValidator from Edge Function context
import { verifyUSI } from '@/lib/utils/usiValidator';

const AU_STATE_CODES = new Set([
  'ACT',
  'NSW',
  'NT',
  'QLD',
  'SA',
  'TAS',
  'VIC',
  'WA',
]);

/**
 * Determines if the supplied state/country combination represents an Australian address.
 */
export const isAustralianAddress = (
  state?: string | null,
  streetCountry?: string | null
) => {
  const normalizedCountry = streetCountry?.trim().toUpperCase();
  if (normalizedCountry) {
    return (
      normalizedCountry === 'AU' ||
      normalizedCountry === 'AUS' ||
      normalizedCountry === 'AUSTRALIA'
    );
  }
  if (!state) return false;
  return AU_STATE_CODES.has(state.trim().toUpperCase());
};

/**
 * Derives the international flag from the citizenship status dropdown value.
 */
export const deriveIsInternational = (citizenship?: string | null) => {
  if (!citizenship) return false;
  return citizenship.trim().toUpperCase() === 'INTL';
};

/**
 * Validates Australian phone number formats.
 * Accepts common formats:
 * - Mobile: 04XX XXX XXX, 04XXXXXXXX, +614XXXXXXXX, 614XXXXXXXX
 * - Landline: (0X) XXXX XXXX, 0X XXXX XXXX, +61X XXXX XXXX, 61X XXXX XXXX
 */
const isValidPhoneNumber = (phone: string | undefined | null): boolean => {
  if (!phone || phone.trim().length === 0) return true; // Allow empty (handled by required validation)

  // Remove all spaces, parentheses, dashes, and plus signs for validation
  const cleaned = phone.replace(/[\s()\-+]/g, '');

  // Mobile: 04XX followed by 6 digits (10 digits total)
  // Landline: 0X followed by 8 digits (10 digits total)
  // International: +61 or 61 followed by 9-10 digits (11-12 digits total)

  // Check for Australian mobile (04XX followed by 6 digits)
  if (/^04\d{8}$/.test(cleaned)) return true;

  // Check for Australian landline (0X followed by 8 digits, where X is 2-9)
  if (/^0[2-9]\d{8}$/.test(cleaned)) return true;

  // Check for international format with +61 or 61 prefix
  // Mobile: 614 followed by 8 digits (11 digits total)
  // Landline: 61[2-9] followed by 8 digits (11 digits total)
  if (/^61[2-9]\d{8}$/.test(cleaned)) return true;
  if (/^614\d{8}$/.test(cleaned)) return true;

  return false;
};

/**
 * Validates Australian postcode format.
 * Australian postcodes must be exactly 4 digits.
 */
const isValidPostcode = (postcode: string | undefined | null): boolean => {
  if (!postcode || postcode.trim().length === 0) return true; // Allow empty (handled by required validation)

  // Remove spaces for validation
  const cleaned = postcode.replace(/\s/g, '');

  // Australian postcodes are exactly 4 digits
  return /^\d{4}$/.test(cleaned);
};

/**
 * Master application schema shared between the Next.js app and Supabase edge functions.
 * All validation logic (AVETMISS + CRICOS) must live here to prevent drift.
 */
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
    // Preferred Location Selection
    preferred_location_id: z.string().min(1, 'Preferred location is required'),
    // Group Selection
    group_id: z
      .string()
      .uuid('Group selection is required')
      .min(1, 'Group selection is required'),
    // Commencement Date
    proposed_commencement_date: z
      .string()
      .min(1, 'Commencement date is required'),

    // Payment Plan
    payment_plan_template_id: z
      .string()
      .min(1, 'Payment plan template is required'),
    payment_anchor_date: z.string().min(1, 'Payment anchor date is required'),

    // Agent
    agent_id: z
      .string()
      .uuid()
      .optional()
      .or(z.literal('none').transform(() => undefined)),

    // Contact
    // AVETMISS & CRICOS: Email is MANDATORY (server-side enforcement)
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    work_phone: z
      .string()
      .optional()
      .refine((val) => isValidPhoneNumber(val), 'Enter a valid phone number'),
    // Mobile phone is MANDATORY for all students (database constraint)
    mobile_phone: z
      .string()
      .optional()
      .refine((val) => isValidPhoneNumber(val), 'Enter a valid phone number'),
    alternative_email: z
      .string()
      .email('Enter a valid email address')
      .optional()
      .or(z.literal('')),

    // Legacy simple address (still present in DB for backward compatibility)
    address_line_1: z.string().optional().or(z.literal('')),
    suburb: z.string().min(1, 'Suburb is required'),
    state: z.string().min(1, 'State is required'),
    postcode: z
      .string()
      .min(1, 'Postcode is required')
      .refine(
        (val) => isValidPostcode(val),
        'Enter a valid postcode (4 digits)'
      ),

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
    postal_postcode: z
      .string()
      .optional()
      .refine(
        (val) => isValidPostcode(val),
        'Enter a valid postcode (4 digits)'
      ),
    postal_country: z.string().optional(),

    // AVETMISS Core
    gender: z.string().min(1, 'Gender is required'), // NAT00080
    highest_school_level_id: z
      .string()
      .min(1, 'Highest school level is required'),
    // NAT00080: Year highest school level completed (conditional)
    // Must be '@@@@' if highest_school_level_id = '02' (Did not go to school)
    // Otherwise must be 2-digit year or '@@'
    year_highest_school_level_completed: z
      .string()
      .refine((val) => {
        // Allow '@@@@' for "Did not go to school" case
        if (val === '@@@@') return true;
        // Allow '@@' for not provided
        if (val === '@@') return true;
        // Allow 2-digit year
        return /^[0-9]{2}$/.test(val);
      }, 'Must be a 2-digit year, @@, or @@@@')
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
    // NAT00080: Disability Flag - AVETMISS requires Y, N, or @ ONLY (no blank)
    disability_flag: z.enum(['Y', 'N', '@']).optional(),
    // NAT00085: Prior Educational Achievement Flag - AVETMISS requires Y, N, or @ ONLY (no blank)
    prior_education_flag: z.enum(['Y', 'N', '@']).optional(),
    // NAT00090: Disability records (stored in form state, persisted on Save Draft)
    disabilities: z
      .array(
        z.object({
          disability_type_id: z.string(),
        })
      )
      .optional()
      .default([]),
    // NAT00085: Prior education records (stored in form state, persisted on Save Draft)
    prior_education: z
      .array(
        z.object({
          prior_achievement_id: z.string(),
          recognition_type: z.string().optional(),
        })
      )
      .optional()
      .default([]),
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
    usi: z
      .string()
      .optional()
      .refine(
        (val) => {
          // If USI is provided, validate its format
          if (!val || val.trim().length === 0) return true;
          return verifyUSI(val);
        },
        {
          message: 'Invalid USI format. Please check for typos.',
        }
      ),
    // USI exemption codes
    usi_exemption_code: z.enum(['INDIV', 'INTOFF']).optional(),
    passport_number: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val || val.trim().length === 0) return true;
          // Must be 6-12 characters and alphanumeric only
          return /^[A-Za-z0-9]{6,12}$/.test(val.trim());
        },
        {
          message: 'Passport number must be 6-12 alphanumeric characters',
        }
      ),
    visa_type: z.string().optional(),
    visa_number: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val || val.trim().length === 0) return true;
          // Flexible format, just require minimum 3 characters
          return val.trim().length >= 3;
        },
        {
          message: 'Visa number must be at least 3 characters',
        }
      ),
    country_of_citizenship: z.string().optional(),
    ielts_score: z.string().optional(),

    // CRICOS: Passport details (enhanced)
    passport_issue_date: z
      .union([z.string(), z.date()])
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          let date: Date;
          if (typeof val === 'string') {
            date = new Date(val);
          } else {
            date = val;
          }
          return !isNaN(date.getTime());
        },
        { message: 'Passport issue date must be valid' }
      ),
    passport_expiry_date: z
      .union([z.string(), z.date()])
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          let date: Date;
          if (typeof val === 'string') {
            date = new Date(val);
          } else {
            date = val;
          }
          return !isNaN(date.getTime());
        },
        { message: 'Passport expiry date must be valid' }
      ),
    place_of_birth: z.string().optional(),

    // CRICOS: Visa information (enhanced)
    visa_application_office: z.string().optional(),
    holds_visa: z.boolean().optional(),

    // CRICOS: Under 18 welfare arrangements
    is_under_18: z.boolean().optional(),
    provider_accepting_welfare_responsibility: z.boolean().optional(),
    welfare_start_date: z
      .union([z.string(), z.date()])
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          let date: Date;
          if (typeof val === 'string') {
            date = new Date(val);
          } else {
            date = val;
          }
          return !isNaN(date.getTime());
        },
        { message: 'Welfare start date must be valid' }
      ),

    // CRICOS: OSHC (Overseas Student Health Cover)
    provider_arranged_oshc: z.boolean().optional(),
    oshc_provider_name: z.string().optional(),
    oshc_start_date: z
      .union([z.string(), z.date()])
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          let date: Date;
          if (typeof val === 'string') {
            date = new Date(val);
          } else {
            date = val;
          }
          return !isNaN(date.getTime());
        },
        { message: 'OSHC start date must be valid' }
      ),
    oshc_end_date: z
      .union([z.string(), z.date()])
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          let date: Date;
          if (typeof val === 'string') {
            date = new Date(val);
          } else {
            date = val;
          }
          return !isNaN(date.getTime());
        },
        { message: 'OSHC end date must be valid' }
      ),

    // CRICOS: English language proficiency (enhanced)
    has_english_test: z.boolean().optional(),
    english_test_type: z.string().optional(),
    english_test_date: z
      .union([z.string(), z.date()])
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          let date: Date;
          if (typeof val === 'string') {
            date = new Date(val);
          } else {
            date = val;
          }
          return !isNaN(date.getTime());
        },
        { message: 'English test date must be valid' }
      ),

    // CRICOS: Previous study in Australia
    has_previous_study_australia: z.boolean().optional(),
    previous_provider_name: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val || val.trim().length === 0) return true;
          // Must be at least 1 character (not empty/whitespace only)
          return val.trim().length >= 1;
        },
        {
          message: 'Previous provider name cannot be empty',
        }
      ),
    completed_previous_course: z.boolean().optional(),
    has_release_letter: z.boolean().optional(),

    // Embedded Emergency Contact
    ec_name: z.string().optional(),
    ec_relationship: z.string().optional(),
    ec_phone_number: z
      .string()
      .optional()
      .refine((val) => isValidPhoneNumber(val), 'Enter a valid phone number'),

    // Embedded Parent/Guardian
    g_name: z.string().optional(),
    g_email: z
      .string()
      .email('Enter a valid email address')
      .optional()
      .or(z.literal('')),
    g_phone_number: z
      .string()
      .optional()
      .refine((val) => isValidPhoneNumber(val), 'Enter a valid phone number'),
    g_relationship: z.string().optional(),
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
      // If "Did not go to school", must be '@@@@'
      if (data.highest_school_level_id === '02') {
        return data.year_highest_school_level_completed === '@@@@';
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
      if (!data.citizenship_status_code) return true;
      return (
        data.is_international ===
        deriveIsInternational(data.citizenship_status_code)
      );
    },
    {
      message: 'International status is derived from the citizenship selection',
      path: ['is_international'],
    }
  )
  .refine(
    (data) => {
      // USI: required for domestic students unless exemption code is present
      if (data.is_international === false) {
        const hasExemption =
          !!data.usi_exemption_code &&
          (data.usi_exemption_code === 'INDIV' ||
            data.usi_exemption_code === 'INTOFF');
        if (!hasExemption) {
          return !!data.usi && data.usi.trim().length > 0;
        }
      }
      return true;
    },
    {
      message: 'USI is required for domestic students',
      path: ['usi'],
    }
  )
  .refine(
    (data) => {
      // Mobile phone is MANDATORY for all students (database constraint)
      return !!data.mobile_phone && data.mobile_phone.trim().length > 0;
    },
    {
      message: 'Mobile phone is required',
      path: ['mobile_phone'],
    }
  )
  .refine(
    (data) => {
      // VSN: required for VIC domestic students under 25
      if (data.state === 'VIC' && data.is_international === false) {
        // Calculate age at commencement date
        const calculateAgeAt = (
          dob: string | Date | undefined,
          atDate: string | undefined
        ): number | null => {
          if (!dob || !atDate) return null;

          let birthDate: Date;
          if (typeof dob === 'string') {
            birthDate = new Date(dob);
          } else {
            birthDate = dob;
          }

          const atDateParsed = new Date(atDate);

          if (isNaN(birthDate.getTime()) || isNaN(atDateParsed.getTime())) {
            return null;
          }

          let age = atDateParsed.getFullYear() - birthDate.getFullYear();
          const monthDiff = atDateParsed.getMonth() - birthDate.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && atDateParsed.getDate() < birthDate.getDate())
          ) {
            age--;
          }
          return age;
        };

        const age = calculateAgeAt(
          data.date_of_birth,
          data.proposed_commencement_date
        );

        if (age !== null && age < 25) {
          const vsn = data.vsn ?? '';
          const ok = vsn === '000000000' || /^[0-9]{9}$/.test(vsn);
          return ok;
        }
      }
      return true;
    },
    {
      message:
        'VSN is required for Victorian domestic students under 25 years old',
      path: ['vsn'],
    }
  )
  .refine(
    (data) => {
      if (
        data.is_international === true &&
        isAustralianAddress(data.state, data.street_country)
      ) {
        return !!data.passport_number && data.passport_number.trim().length > 0;
      }
      return true;
    },
    {
      message:
        'Passport number is required for international students in Australia',
      path: ['passport_number'],
    }
  )
  .refine(
    (data) => {
      // CRICOS: Under 18 fields required if is_under_18 is true (or computed from age)
      // Compute is_under_18 from age if not explicitly set
      let isUnder18 = data.is_under_18;
      if (isUnder18 === undefined) {
        // Calculate age at commencement date
        const calculateAgeAt = (
          dob: string | Date | undefined,
          atDate: string | undefined
        ): number | null => {
          if (!dob || !atDate) return null;

          let birthDate: Date;
          if (typeof dob === 'string') {
            birthDate = new Date(dob);
          } else {
            birthDate = dob;
          }

          const atDateParsed = new Date(atDate);

          if (isNaN(birthDate.getTime()) || isNaN(atDateParsed.getTime())) {
            return null;
          }

          let age = atDateParsed.getFullYear() - birthDate.getFullYear();
          const monthDiff = atDateParsed.getMonth() - birthDate.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && atDateParsed.getDate() < birthDate.getDate())
          ) {
            age--;
          }
          return age;
        };

        const age = calculateAgeAt(
          data.date_of_birth,
          data.proposed_commencement_date
        );
        if (age !== null) {
          isUnder18 = age < 18;
        }
      }

      if (isUnder18 === true) {
        return data.provider_accepting_welfare_responsibility !== undefined;
      }
      return true;
    },
    {
      message:
        'Provider accepting welfare responsibility is required for students under 18',
      path: ['provider_accepting_welfare_responsibility'],
    }
  )
  .refine(
    (data) => {
      // CRICOS: Welfare start date required if provider accepting responsibility
      if (data.provider_accepting_welfare_responsibility === true) {
        return !!data.welfare_start_date;
      }
      return true;
    },
    {
      message:
        'Welfare start date is required when provider accepts welfare responsibility',
      path: ['welfare_start_date'],
    }
  )
  .refine(
    (data) => {
      // CRICOS: OSHC fields required if provider_arranged_oshc is true
      if (data.provider_arranged_oshc === true) {
        return (
          !!data.oshc_provider_name &&
          !!data.oshc_start_date &&
          !!data.oshc_end_date
        );
      }
      return true;
    },
    {
      message:
        'OSHC provider name, start date, and end date are required when provider arranges OSHC',
      path: ['oshc_provider_name'],
    }
  )
  .refine(
    (data) => {
      // CRICOS: English test fields required if has_english_test is true
      if (data.has_english_test === true) {
        return !!data.english_test_type && !!data.ielts_score;
      }
      return true;
    },
    {
      message:
        'English test type and score are required when student has taken English test',
      path: ['english_test_type'],
    }
  )
  .refine(
    (data) => {
      // CRICOS: Previous study fields required if has_previous_study_australia is true
      if (data.has_previous_study_australia === true) {
        return (
          !!data.previous_provider_name &&
          data.completed_previous_course !== undefined &&
          data.has_release_letter !== undefined
        );
      }
      return true;
    },
    {
      message:
        'Previous provider name, completion status, and release letter status are required when student has previous study in Australia',
      path: ['previous_provider_name'],
    }
  );

export type ApplicationFormValues = z.infer<typeof applicationSchema>;
