
// =============================================================================
// FILE:        applications/index.ts
// PROJECT:     XPortal Student Management System (SMS)
// AUTHOR:      Lead Backend Engineer
// DATE:        2025-09-07
// VERSION:     1.0.0
//
// DESCRIPTION:
// This file implements the complete, end-to-end application and enrolment
// workflow. It is the single most critical "write path" in the system.
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError, ValidationError } from '../_shared/errors.ts';
import { deepMerge } from '../_shared/utils.ts';
import { validateFullEnrolmentPayload } from '../_shared/validators.ts';
import type { components } from '../_shared/api.types.ts';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import type { ExpressionBuilder } from 'npm:kysely';
import type { DB } from '../_shared/database.types.ts';
import { sql, type SqlBool } from 'npm:kysely';

type FullEnrolmentPayload = components['schemas']['FullEnrolmentPayload'];
type ApprovalPayload = components['schemas']['ApprovalPayload'];

// Database row types
interface ApplicationRow {
  id: string;
  status: string;
  application_payload: Record<string, unknown>;
  created_client_id: string | null;
  created_enrolment_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// Transaction type for database operations - Kysely transaction type is complex, using any for pragmatic reasons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DatabaseTransaction = any;

// --- Logic: List Applications ---
const listApplicationsLogic = async (req: Request, _ctx: ApiContext) => {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    
    const offset = (page - 1) * limit;
    
    // Build the base query
    let query = db.selectFrom('sms_op.applications')
      .select([
        'id',
        'status', 
        'application_payload',
        'created_client_id',
        'created_enrolment_id',
        'created_at',
        'updated_at'
      ]);
    
    // Apply status filter if provided
    if (status && ['Draft', 'Submitted', 'Approved', 'Rejected'].includes(status)) {
      query = query.where('status', '=', status);
    }
    
    // Apply search filter if provided (search in personalDetails name or email)
    if (search) {
      // Use raw SQL for JSONB operations to bypass Kysely type limitations
      const searchPattern = `%${search}%`;
      query = query.where(sql<SqlBool>`(
        jsonb_extract_path_text(application_payload, 'personalDetails', 'firstName') ILIKE ${searchPattern} OR
        jsonb_extract_path_text(application_payload, 'personalDetails', 'lastName') ILIKE ${searchPattern} OR
        jsonb_extract_path_text(application_payload, 'personalDetails', 'primaryEmail') ILIKE ${searchPattern}
      )`);
    }
    
    // Get total count for pagination (separate query to avoid GROUP BY issues)
    let countQuery = db.selectFrom('sms_op.applications')
      .select((eb: ExpressionBuilder<DB, 'sms_op.applications'>) => eb.fn.count('id').as('total'));
    
    // Apply the same filters to count query
    if (status && ['Draft', 'Submitted', 'Approved', 'Rejected'].includes(status)) {
      countQuery = countQuery.where('status', '=', status);
    }
    
    if (search) {
      const searchPattern = `%${search}%`;
      countQuery = countQuery.where(sql<SqlBool>`(
        jsonb_extract_path_text(application_payload, 'personalDetails', 'firstName') ILIKE ${searchPattern} OR
        jsonb_extract_path_text(application_payload, 'personalDetails', 'lastName') ILIKE ${searchPattern} OR
        jsonb_extract_path_text(application_payload, 'personalDetails', 'primaryEmail') ILIKE ${searchPattern}
      )`);
    }
    
    const totalResult = await countQuery.executeTakeFirst();
    const total = Number(totalResult?.total || 0);
    
    // Get paginated results
    const applications = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();
    
    // Transform to ApplicationSummary format
    const applicationSummaries = applications.map((app) => {
      const payload = app.application_payload as Record<string, unknown>;
      const personalDetails = (payload?.personalDetails as Record<string, unknown>) || {};
      const _enrolmentDetails = (payload?.enrolmentDetails as Record<string, unknown>) || {};
      
      return {
        id: app.id,
        status: app.status,
        clientName: personalDetails.firstName && personalDetails.lastName 
          ? `${personalDetails.firstName} ${personalDetails.lastName}`.trim()
          : '',
        clientEmail: (personalDetails.primaryEmail as string) || '',
        programName: null, // Will be populated when we have program lookup
        agentName: null, // Will be populated when we have agent lookup
        createdAt: app.created_at,
        updatedAt: app.updated_at,
        createdClientId: app.created_client_id,
        createdEnrolmentId: app.created_enrolment_id
      };
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;
    
    const response = {
      data: applicationSummaries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrevious
      }
    };
    
    return new Response(JSON.stringify(response), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[APPLICATIONS_ERROR]', error);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

// --- Logic: Get Application by ID ---
const getApplicationLogic = async (_req: Request, _ctx: ApiContext, applicationId: string) => {
  try {
    const application = await db.selectFrom('sms_op.applications')
      .select(['id', 'status', 'application_payload', 'created_client_id', 'created_enrolment_id', 'created_by_staff_id', 'created_at', 'updated_at'])
      .where('id', '=', applicationId)
      .executeTakeFirst();
    
    if (!application) {
      return new Response(JSON.stringify({ message: 'Application not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify(application), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[GET_APPLICATION_ERROR]', error);
    return new Response(JSON.stringify({ message: 'Database error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

// --- Logic: Create a new Draft Application ---
const createApplicationLogic = async (_req: Request, _ctx: ApiContext, body: unknown) => {
  const payload = body as Partial<FullEnrolmentPayload> | null;
  const newApplication = await db.insertInto('sms_op.applications')
    .values({ status: 'Draft', application_payload: payload ?? {} })
    .returningAll().executeTakeFirstOrThrow();
  return new Response(JSON.stringify(newApplication), {
    status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

// --- Logic: Update a Draft Application ---
const updateApplicationLogic = async (_req: Request, _ctx: ApiContext, body: unknown, applicationId: string) => {
  const payload = body as Partial<FullEnrolmentPayload> & { status?: string };
  const updatedApplication = await db.transaction().execute(async (trx: DatabaseTransaction) => {
    const existingApplication = await trx.selectFrom('sms_op.applications')
      .selectAll().where('id', '=', applicationId).forUpdate().executeTakeFirst();
    if (!existingApplication) throw new NotFoundError('Application not found.');
    if (existingApplication.status !== 'Draft' && !payload.status) {
      throw new ValidationError(`Cannot update an application with status '${existingApplication.status}'.`);
    }
    
    const updateData: Record<string, unknown> = { updated_at: new Date() };
    
    // Handle status updates
    if (payload.status) {
      updateData.status = payload.status;
    }
    
    // Handle payload updates (exclude status from payload merge)
    const { status: _status, ...payloadData } = payload;
    if (payloadData && Object.keys(payloadData).length > 0) {
      const mergedPayload = deepMerge(existingApplication.application_payload as FullEnrolmentPayload, payloadData);
      updateData.application_payload = mergedPayload;
    }
    
    return await trx.updateTable('sms_op.applications')
      .set(updateData)
      .where('id', '=', applicationId).returningAll().executeTakeFirstOrThrow();
  });
  return new Response(JSON.stringify(updatedApplication), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

// --- Logic: Submit a Draft for Approval ---
const submitApplicationLogic = async (_req: Request, _ctx: ApiContext, _body: unknown, applicationId: string) => {
  const submittedApplication = await db.transaction().execute(async (trx: DatabaseTransaction) => {
    const application = await trx.selectFrom('sms_op.applications')
      .selectAll().where('id', '=', applicationId).forUpdate().executeTakeFirst();

    if (!application) throw new NotFoundError('Application not found.');
    if (application.status === 'Submitted') return application;
    if (application.status !== 'Draft') {
      throw new ValidationError(`Only applications in 'Draft' status can be submitted.`);
    }

    validateFullEnrolmentPayload(application.application_payload);

    return await trx.updateTable('sms_op.applications')
      .set({ status: 'Submitted', updated_at: new Date() })
      .where('id', '=', applicationId).returningAll().executeTakeFirstOrThrow();
  });
  return new Response(JSON.stringify(submittedApplication), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const ApprovalPayloadSchema = z.object({
  tuitionFeeSnapshot: z.number(),
  agentCommissionRateSnapshot: z.number(),
  action: z.string().optional(),
  notes: z.string().optional(),
});
// --- Logic: Approve a Submitted Application (The Master Transaction) ---
const approveApplicationLogic = async (_req: Request, _ctx: ApiContext, body: unknown, applicationId: string) => {
  // 1. Validate the incoming approval payload.
  const approvalPayload = ApprovalPayloadSchema.parse(body);

  const { clientId, enrolmentId } = await db.transaction().execute(async (trx: DatabaseTransaction) => {
    // 2. Lock the application row and validate its state.
    const application = await trx.selectFrom('sms_op.applications')
      .selectAll().where('id', '=', applicationId).forUpdate().executeTakeFirst();

    if (!application) {
      throw new NotFoundError('Application not found.');
    }
    if (application.status !== 'Submitted') {
      throw new ValidationError(`Only applications in 'Submitted' status can be approved.`);
    }

    // 3. Validate the entire application payload against our master validator.
    const payload = validateFullEnrolmentPayload(application.application_payload);

    // 4. Begin the master transaction: Create the core client record.
    const { id: newClientId } = await trx.insertInto('core.clients')
      .values({
        client_identifier: `XPT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        first_name: payload.personalDetails.firstName,
        last_name: payload.personalDetails.lastName,
        date_of_birth: payload.personalDetails.dateOfBirth,
        gender: payload.personalDetails.gender,
        primary_email: payload.personalDetails.primaryEmail,
        unique_student_identifier: payload.usi.usi,
        country_of_birth_identifier: payload.avetmissDetails.countryOfBirthId,
      }).returning('id').executeTakeFirstOrThrow();

    // 5. Create address records.
    const { id: addressId } = await trx.insertInto('core.addresses')
      .values({
        suburb: payload.address.residential.suburb,
        state_identifier: payload.address.residential.state,
        postcode: payload.address.residential.postcode,
        country_identifier: '1101', // Default to Australia for now
        street_number: payload.address.residential.street_number,
        street_name: payload.address.residential.street_name,
        flat_unit_details: payload.address.residential.flat_unit_details,
        building_property_name: payload.address.residential.building_property_name
      }).returning('id').executeTakeFirstOrThrow();
    await trx.insertInto('core.client_addresses')
      .values({ client_id: newClientId, address_id: addressId, address_type: 'HOME' }).execute();
    // (Add logic for separate postal address here if needed)

    // 6. Create compliance records.
    await trx.insertInto('avetmiss.client_avetmiss_details')
      .values({ 
        client_id: newClientId,
        highest_school_level_completed_identifier: payload.avetmissDetails.highestSchoolLevelId,
        indigenous_status_identifier: payload.avetmissDetails.indigenousStatusId,
        language_identifier: payload.avetmissDetails.languageAtHomeId,
        labour_force_status_identifier: payload.avetmissDetails.labourForceId,
        disability_flag: payload.avetmissDetails.hasDisability ? 'Y' : 'N',
        prior_educational_achievement_flag: payload.avetmissDetails.hasPriorEducation ? 'Y' : 'N',
        at_school_flag: payload.avetmissDetails.isAtSchool ? 'Y' : 'N',
      }).execute();

    if (payload.isInternationalStudent && payload.cricosDetails) {
      await trx.insertInto('cricos.client_details')
        .values({ 
          client_id: newClientId,
          country_of_citizenship_id: payload.cricosDetails.countryOfCitizenshipId,
          passport_number: payload.cricosDetails.passportNumber,
          passport_expiry_date: payload.cricosDetails.passportExpiryDate
        }).execute();
    }

    // 7. Create the operational enrolment record.
    const { id: newEnrolmentId } = await trx.insertInto('sms_op.enrolments')
      .values({
        client_id: newClientId,
        course_offering_id: payload.enrolmentDetails.courseOfferingId,
        status: 'Active',
        agent_id: payload.agentId,
        tuition_fee_snapshot: approvalPayload.tuitionFeeSnapshot,
        agent_commission_rate_snapshot: approvalPayload.agentCommissionRateSnapshot,
      }).returning('id').executeTakeFirstOrThrow();

    // 8. Create the versioned "Academic Contract".
    const subjectsToInsert = [
      ...payload.enrolmentDetails.subjectStructure.coreSubjectIds.map((id: string) => ({ enrolment_id: newEnrolmentId, subject_id: id, unit_type: 'Core' })),
      ...payload.enrolmentDetails.subjectStructure.electiveSubjectIds.map((id: string) => ({ enrolment_id: newEnrolmentId, subject_id: id, unit_type: 'Elective' })),
    ];
    if (subjectsToInsert.length > 0) {
      await trx.insertInto('sms_op.enrolment_subjects').values(subjectsToInsert).execute();
    }

    // 9. Finalize the application state.
    await trx.updateTable('sms_op.applications')
      .set({ status: 'Approved', updated_at: new Date(), created_client_id: newClientId, created_enrolment_id: newEnrolmentId })
      .where('id', '=', applicationId).execute();

    return { clientId: newClientId, enrolmentId: newEnrolmentId };
  });

  return new Response(JSON.stringify({
    message: "Application approved and enrolment created successfully.",
    clientId,
    enrolmentId,
  }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// --- Helper function for UUID validation ---
const validateApplicationId = (applicationId: string): Response | null => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(applicationId)) {
    return new Response(JSON.stringify({ message: 'Invalid application ID format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return null;
};

// --- The Main Router ---
const applicationsRouter = async (req: Request, ctx: ApiContext, body: unknown): Promise<Response> => {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  if (pathSegments[0] === 'applications') {
    if (pathSegments.length === 1 && method === 'GET') {
      return await listApplicationsLogic(req, ctx);
    }
    if (pathSegments.length === 1 && method === 'POST') {
      return await createApplicationLogic(req, ctx, body);
    }
    if (pathSegments.length === 2 && method === 'GET') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await getApplicationLogic(req, ctx, pathSegments[1]);
    }
    if (pathSegments.length === 2 && method === 'PATCH') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await updateApplicationLogic(req, ctx, body, pathSegments[1]);
    }
    if (pathSegments.length === 3 && pathSegments[2] === 'submit' && method === 'POST') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await submitApplicationLogic(req, ctx, body, pathSegments[1]);
    }
    if (pathSegments.length === 3 && pathSegments[2] === 'approve' && method === 'POST') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await approveApplicationLogic(req, ctx, body, pathSegments[1]);
    }
  }

  return new Response('Not Found', { status: 404, headers: corsHeaders });
};

const handler = createApiRoute(applicationsRouter);

serve(handler);

