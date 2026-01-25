/// <reference lib="deno.ns" />

//
// XPortal - Submit Application Edge Function
//
// This function is responsible for the critical business logic of submitting a new application.
// It performs server-side validation of all mandatory AVETMISS fields before
// transitioning the application's status from 'DRAFT' to 'SUBMITTED'.
//

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
// Import shared submission validator from _shared directory
// Note: This ensures all Edge Functions use the same validation logic
import {
  validateSubmission,
  computeDerivedFields,
  type SubmissionValues,
} from '../_shared/application-submission.ts';

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

// Use shared validator instead of duplicating rules here.

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
    if (application.status === 'ARCHIVED') {
      return new Response(
        JSON.stringify({
          error: 'Archived applications are read-only and cannot be submitted.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        }
      );
    }

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

    // 4a. Fetch disabilities and prior_education arrays from junction tables
    // These arrays are required by the validation schema but are not stored in the applications table
    console.log(
      `[Submit Application] Fetching arrays for application ${applicationId}`
    );

    const { data: disabilitiesData, error: disabilitiesErr } =
      await supabaseClient
        .from('application_disabilities')
        .select('disability_type_id')
        .eq('application_id', applicationId);

    if (disabilitiesErr) {
      console.error(
        `[Submit Application] Error fetching disabilities:`,
        disabilitiesErr.message
      );
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch disabilities',
          details: [disabilitiesErr.message],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const { data: priorEdData, error: priorEdErr } = await supabaseClient
      .from('application_prior_education')
      .select('prior_achievement_id, recognition_type')
      .eq('application_id', applicationId);

    if (priorEdErr) {
      console.error(
        `[Submit Application] Error fetching prior education:`,
        priorEdErr.message
      );
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch prior education',
          details: [priorEdErr.message],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Transform junction table records into array format matching schema
    const applicationWithArrays = {
      ...application,
      disabilities: (disabilitiesData || []).map((d) => ({
        disability_type_id: d.disability_type_id,
      })),
      prior_education: (priorEdData || []).map((e) => ({
        prior_achievement_id: e.prior_achievement_id,
        recognition_type: e.recognition_type || undefined,
      })),
    };

    console.log(
      `[Submit Application] Application with arrays - disabilities: ${applicationWithArrays.disabilities.length}, prior_education: ${applicationWithArrays.prior_education.length}`
    );

    // Rule: The application must pass all AVETMISS/CRICOS validation checks.
    console.log(
      `[Submit Application] Validating application with schema validation`
    );
    const validation = validateSubmission(applicationWithArrays);
    if (!validation.ok) {
      console.error(
        `[Submit Application] Schema validation failed:`,
        validation.issues
      );
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validation.issues.map((i) => `${i.path}: ${i.message}`),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    console.log(`[Submit Application] Schema validation passed`);

    // 4b. Secondary validation: Verify junction table records match arrays (defense-in-depth)
    // This provides an additional safety check to ensure database consistency
    if (application.disability_flag === 'Y') {
      if (
        !applicationWithArrays.disabilities ||
        applicationWithArrays.disabilities.length === 0
      ) {
        console.error(
          `[Submit Application] Disability flag is Y but no disabilities in array`
        );
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: [
              'disability_flag is Y but no disability records found. Please select at least one disability type.',
            ],
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
    }

    if (application.prior_education_flag === 'Y') {
      if (
        !applicationWithArrays.prior_education ||
        applicationWithArrays.prior_education.length === 0
      ) {
        console.error(
          `[Submit Application] Prior education flag is Y but no prior education in array`
        );
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: [
              'prior_education_flag is Y but no prior education records found. Please select at least one prior education qualification.',
            ],
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
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

    // 5a. Freeze payment schedule snapshot (including line items) before changing status
    const { error: freezePaymentError } = await supabaseClient.rpc(
      'freeze_application_payment_schedule',
      { app_id: applicationId }
    );

    if (freezePaymentError) {
      console.error(
        'Freeze payment schedule failed:',
        freezePaymentError.message
      );
      return new Response(
        JSON.stringify({ error: 'Failed to freeze payment schedule' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 6. Compute and persist derived fields (server is the SSoT).
    // Cast database row to SubmissionValues for computeDerivedFields
    // The database row structure is compatible with SubmissionValues
    const { survey_contact_status, is_under_18 } = computeDerivedFields(
      application as unknown as SubmissionValues
    );

    // 6a. Update derived fields before status change
    {
      const { error: derivedErr } = await supabaseClient
        .from('applications')
        .update({
          survey_contact_status,
          is_under_18,
        })
        .eq('id', applicationId);
      if (derivedErr) {
        console.error('Failed to write derived fields:', derivedErr.message);
        return new Response(
          JSON.stringify({ error: 'Failed to persist derived fields' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
    }

    // 6b. If all validation passes, update the application status to 'SUBMITTED'.
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
