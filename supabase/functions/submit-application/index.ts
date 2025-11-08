/// <reference lib="deno.ns" />

//
// XPortal - Submit Application Edge Function
//
// This function is responsible for the critical business logic of submitting a new application.
// It performs server-side validation of all mandatory AVETMISS fields before
// transitioning the application's status from 'DRAFT' to 'SUBMITTED'.
//

import { serve } from 'std/http/server.ts';
import { z } from 'https://esm.sh/zod@3.23.8';
import { createClient } from '@supabase/supabase-js';

// --- Type Imports ---
// Import the auto-generated TypeScript types for your database.
// For this to work, you must have a copy of your `database.types.ts` file
// in the `supabase/functions/_shared/` directory.
import { Database } from '../_shared/database.types.ts';

// --- CORS Configuration ---
// Define CORS headers to allow requests from your web application.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // In production, you should restrict this to your domain.
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/**
 * Validates an application object against mandatory AVETMISS business rules.
 * This function is the primary quality gate for compliance.
 * @param application - The full application object to validate.
 * @returns An array of human-readable error strings. An empty array signifies a valid application.
 */
// Build a Zod schema mirroring the client-side applicationSchema for required fields
// Note: This server schema enforces mandatory AVETMISS fields only.
const serverApplicationSchema = z
  .object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    date_of_birth: z.union([z.string().min(1), z.date()]),
    suburb: z.string().min(1),
    state: z.string().min(1),
    postcode: z.string().min(1),
    gender: z.string().min(1),
    highest_school_level_id: z.string().min(1),
    indigenous_status_id: z.string().min(1),
    labour_force_status_id: z.string().min(1),
    country_of_birth_id: z.string().min(1),
    language_code: z.string().min(1),
    citizenship_status_code: z.string().min(1),
    at_school_flag: z.string().min(1),
    // optional fields permitted
    address_line_1: z.string().optional().or(z.literal('')),
    // CRICOS fields (nullable/optional in base schema, validated conditionally based on is_international)
    // Using .nullish() to allow both null and undefined values
    is_international: z.boolean().nullish(),
    written_agreement_accepted: z.boolean().nullish(),
    written_agreement_date: z.union([z.string(), z.date()]).nullish(),
    privacy_notice_accepted: z.boolean().nullish(),
    passport_number: z.string().nullish(),
    street_country: z.string().nullish(),
    is_under_18: z.boolean().nullish(),
    provider_accepting_welfare_responsibility: z.boolean().nullish(),
    welfare_start_date: z.union([z.string(), z.date()]).nullish(),
    provider_arranged_oshc: z.boolean().nullish(),
    oshc_provider_name: z.string().nullish(),
    oshc_start_date: z.union([z.string(), z.date()]).nullish(),
    oshc_end_date: z.union([z.string(), z.date()]).nullish(),
    has_english_test: z.boolean().nullish(),
    english_test_type: z.string().nullish(),
    ielts_score: z.string().nullish(),
    has_previous_study_australia: z.boolean().nullish(),
    previous_provider_name: z.string().nullish(),
    completed_previous_course: z.boolean().nullish(),
    has_release_letter: z.boolean().nullish(),
    proposed_course_end_date: z.union([z.string(), z.date()]).nullish(),
  })
  .refine(
    (data) => {
      // CRICOS: Written agreement is required for international students
      if (data.is_international === true) {
        return data.written_agreement_accepted === true;
      }
      return true;
    },
    {
      message:
        'Written agreement acceptance is required for international students',
      path: ['written_agreement_accepted'],
    }
  )
  .refine(
    (data) => {
      // CRICOS: Written agreement date is required if agreement is accepted
      if (data.written_agreement_accepted === true) {
        return !!data.written_agreement_date;
      }
      return true;
    },
    {
      message: 'Written agreement date is required',
      path: ['written_agreement_date'],
    }
  )
  .refine(
    (data) => {
      // CRICOS: Privacy notice is required for international students
      if (data.is_international === true) {
        return data.privacy_notice_accepted === true;
      }
      return true;
    },
    {
      message:
        'Privacy notice acceptance is required for international students',
      path: ['privacy_notice_accepted'],
    }
  )
  .refine(
    (data) => {
      // CRICOS: Passport number is mandatory if international AND student in Australia
      if (
        data.is_international === true &&
        (data.street_country === 'Australia' || data.state)
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
      // CRICOS: Under 18 fields required if is_under_18 is true
      if (data.is_under_18 === true) {
        return data.provider_accepting_welfare_responsibility != null;
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
          data.completed_previous_course != null &&
          data.has_release_letter != null
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

function validateApplication(application: unknown): string[] {
  const result = serverApplicationSchema.safeParse(application);
  if (result.success) return [];
  return result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

/**
 * The main Deno request handler.
 */
serve(async (req: Request) => {
  // This is a standard requirement for CORS-enabled routes.
  // It handles the preflight request sent by the browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Create a Supabase client with the user's authentication context.
    // This is a critical security step that ensures all database operations
    // respect your Row-Level Security policies.
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // 2. Extract the `applicationId` from the request body.
    const { applicationId } = await req.json();
    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: 'applicationId is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400, // Bad Request
        }
      );
    }

    // 3. Fetch the application data from the database.
    const { data: application, error: fetchError } = await supabaseClient
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError) {
      console.error(
        `Fetch Error for application ID ${applicationId}:`,
        fetchError.message
      );
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404, // Not Found
      });
    }

    // 4. Perform business rule validation.
    // Rule: An application can only be submitted if it's currently a 'DRAFT'.
    if (application.status !== 'DRAFT') {
      return new Response(
        JSON.stringify({
          error: `Application is already in '${application.status}' status and cannot be submitted again.`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict - indicates a state mismatch.
        }
      );
    }

    // Rule: The application must pass all AVETMISS validation checks.
    const validationErrors = validateApplication(application);
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validationErrors,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 5. Freeze learning plan snapshot before changing status
    const { error: freezeError } = await supabaseClient.rpc(
      'freeze_application_learning_plan',
      { app_id: applicationId }
    );

    if (freezeError) {
      console.error('Freeze learning plan failed:', freezeError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to freeze learning plan' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 6. If all validation passes, update the application status to 'SUBMITTED'.
    const { error: updateError } = await supabaseClient
      .from('applications')
      .update({ status: 'SUBMITTED' })
      .eq('id', applicationId);

    if (updateError) {
      console.error(
        `Update Error for application ID ${applicationId}:`,
        updateError.message
      );
      // This is a server-side issue, so we throw to trigger the 500 error handler.
      throw new Error('Failed to update application status in the database.');
    }

    // 7. Return a success response to the client.
    return new Response(
      JSON.stringify({ message: 'Application submitted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // OK
      }
    );
  } catch (error) {
    // Type-safe error handling.
    // We check if the caught object is an instance of Error before accessing .message.
    if (error instanceof Error) {
      console.error('Unexpected Error:', error.message);
    } else {
      // If something else was thrown (e.g., a string or object), log it directly.
      console.error('An unexpected non-Error value was thrown:', error);
    }

    return new Response(
      JSON.stringify({ error: 'An internal server error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // Internal Server Error
      }
    );
  }
});
