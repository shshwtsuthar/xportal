
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

// Buffer polyfill for Deno - will be available globally from database.types.ts
import { join } from 'https://deno.land/std@0.177.0/path/mod.ts';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import type { ExpressionBuilder } from 'npm:kysely';
import type { DB } from '../_shared/database.types.ts';
import { sql, type SqlBool } from 'npm:kysely';

type FullEnrolmentPayload = components['schemas']['FullEnrolmentPayload'];
type ApprovalPayload = components['schemas']['ApprovalPayload'];
type ApplicationSummary = components['schemas']['ApplicationSummary'];
type ApplicationListResponse = components['schemas']['ApplicationListResponse'];

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
// deno-lint-ignore no-explicit-any
type DatabaseTransaction = any;
// --- Payment Plan Snapshot Validation ---
const PaymentPlanAnchorEnum = z.enum(['OFFER_LETTER','COMMENCEMENT','CUSTOM']);
const PaymentPlanInstalmentSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const PaymentPlanSnapshotSchema = z.object({
  selectedTemplateId: z.string().uuid(),
  anchor: PaymentPlanAnchorEnum,
  anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  schedule: z.array(PaymentPlanInstalmentSchema).min(1).max(24),
  tuitionFeeSnapshot: z.number().positive(),
});

function validatePaymentPlanSnapshotOrThrow(appPayload: Record<string, unknown>): void {
  const paymentPlan = (appPayload as any)?.paymentPlan;
  if (!paymentPlan) {
    throw new ValidationError('Payment plan selection and snapshot are required before submit.');
  }
  const parsedResult = PaymentPlanSnapshotSchema.safeParse(paymentPlan);
  if (!parsedResult.success) {
    const issues = parsedResult.error.issues.map(issue => issue.message);
    throw new ValidationError('Invalid payment plan snapshot.', { issues });
  }
  const parsed = parsedResult.data;
  const sum = parsed.schedule.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  if (Math.round(parsed.tuitionFeeSnapshot * 100) !== Math.round(sum * 100)) {
    throw new ValidationError('Payment plan tuitionFeeSnapshot must equal the sum of instalment amounts.');
  }
}


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
    if (status && ['Draft', 'Submitted', 'AwaitingPayment', 'Accepted', 'Approved', 'Rejected'].includes(status)) {
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
    if (status && ['Draft', 'Submitted', 'AwaitingPayment', 'Accepted', 'Approved', 'Rejected'].includes(status)) {
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
  
  // Handle case where payload might be null
  if (!payload) {
    const emptyPayload = {} as Partial<FullEnrolmentPayload> & { status?: string };
    return await updateApplicationLogic(_req, _ctx, emptyPayload, applicationId);
  }
  const updatedApplication = await db.transaction().execute(async (trx: DatabaseTransaction) => {
    const existingApplication = await trx.selectFrom('sms_op.applications')
      .selectAll().where('id', '=', applicationId).forUpdate().executeTakeFirst();
    if (!existingApplication) throw new NotFoundError('Application not found.');
    
    // Handle case where status might be null (defensive programming)
    const currentStatus = existingApplication.status || 'Draft';
    if (currentStatus !== 'Draft' && !payload.status) {
      throw new ValidationError(`Cannot update an application with status '${currentStatus}'.`);
    }
    
    const updateData: Record<string, unknown> = { updated_at: new Date() };
    
    // Handle status updates
    if (payload.status) {
      updateData.status = payload.status;
    } else if (!existingApplication.status) {
      // If status is null, set it to Draft
      updateData.status = 'Draft';
    }
    
    // Handle payload updates (exclude status from payload merge)
    const { status: _status, ...payloadData } = payload;
    if (payloadData && Object.keys(payloadData).length > 0) {
      // If paymentPlan provided, normalize tuition; validate only when schedule has items
      if ((payloadData as any).paymentPlan) {
        const candidate = (payloadData as any).paymentPlan as Record<string, unknown>;
        const scheduleArr = Array.isArray((candidate as any).schedule) ? ((candidate as any).schedule as any[]) : [];
        if (scheduleArr.length > 0 && (candidate as any).tuitionFeeSnapshot == null) {
          const sum = scheduleArr.reduce((s, i) => s + (Number(i.amount) || 0), 0);
          (candidate as any).tuitionFeeSnapshot = Number(sum.toFixed(2));
        }
        // Soft validation during PATCH: only enforce when schedule has items to avoid blocking autosave
        if (scheduleArr.length > 0) {
          const r = PaymentPlanSnapshotSchema.safeParse(candidate);
          if (!r.success) {
            const issues = r.error.issues.map(issue => issue.message);
            throw new ValidationError('Invalid payment plan snapshot.', { issues });
          }
        }
      }
      
      // Ensure we have a valid target for deepMerge
      const existingPayload = existingApplication.application_payload || {};
      const mergedPayload = deepMerge(existingPayload as FullEnrolmentPayload, payloadData);
      
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

// --- Logic: Delete Application ---
const deleteApplicationLogic = async (_req: Request, _ctx: ApiContext, applicationId: string) => {
  await db.transaction().execute(async (trx: DatabaseTransaction) => {
    // Check if application exists
    const existingApplication = await trx.selectFrom('sms_op.applications')
      .selectAll().where('id', '=', applicationId).forUpdate().executeTakeFirst();
    
    if (!existingApplication) {
      throw new NotFoundError('Application not found.');
    }

    // Delete the application completely from the database
    await trx.deleteFrom('sms_op.applications')
      .where('id', '=', applicationId)
      .execute();
  });

  return new Response(null, {
    status: 204, headers: corsHeaders,
  });
};

// --- Logic: Submit a Draft for Approval ---
const submitApplicationLogic = async (_req: Request, _ctx: ApiContext, _body: unknown, applicationId: string) => {
  const submittedApplication = await db.transaction().execute(async (trx: DatabaseTransaction) => {
    const application = await trx.selectFrom('sms_op.applications')
      .selectAll().where('id', '=', applicationId).forUpdate().executeTakeFirst();

    if (!application) throw new NotFoundError('Application not found.');
    
    // Handle case where status might be null (defensive programming)
    const currentStatus = application.status || 'Draft';
    if (currentStatus === 'Submitted') return application;
    if (currentStatus !== 'Draft') {
      throw new ValidationError(`Only applications in 'Draft' status can be submitted.`);
    }

    validateFullEnrolmentPayload(application.application_payload);
    // Enforce payment plan presence and correctness at submit time
    validatePaymentPlanSnapshotOrThrow(application.application_payload as Record<string, unknown>);

    return await trx.updateTable('sms_op.applications')
      .set({ status: 'Submitted', updated_at: new Date() })
      .where('id', '=', applicationId).returningAll().executeTakeFirstOrThrow();
  });
  return new Response(JSON.stringify(submittedApplication), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const ApprovalPayloadSchema = z.object({
  tuitionFeeSnapshot: z.number().optional(),
  agentCommissionRateSnapshot: z.number().optional(),
  action: z.string().optional(),
  notes: z.string().optional(),
}).optional();
// --- Logic: Approve a Submitted Application (The Master Transaction) ---
const approveApplicationLogic = async (_req: Request, _ctx: ApiContext, body: unknown, applicationId: string) => {
  // 1. Validate the incoming approval payload (optional per new flow).
  const approvalPayload = ApprovalPayloadSchema.parse(body) ?? {};

  const { clientId, enrolmentId } = await db.transaction().execute(async (trx: DatabaseTransaction) => {
    // 2. Lock the application row and validate its state.
    const application = await trx.selectFrom('sms_op.applications')
      .selectAll().where('id', '=', applicationId).forUpdate().executeTakeFirst();

    if (!application) {
      throw new NotFoundError('Application not found.');
    }
    
    // Handle case where status might be null (defensive programming)
    const currentStatus = application.status || 'Draft';
    if (currentStatus !== 'Accepted') {
      throw new ValidationError(`Only applications in 'Accepted' status can be approved.`);
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
        tuition_fee_snapshot: (approvalPayload as any).tuitionFeeSnapshot ?? (application.application_payload as any)?.tuitionFeeSnapshot ?? null,
        agent_commission_rate_snapshot: (approvalPayload as any).agentCommissionRateSnapshot ?? (application.application_payload as any)?.agentCommissionRateSnapshot ?? null,
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

// --- Reject Application Logic ---
const rejectApplicationLogic = async (_req: Request, _ctx: ApiContext, body: unknown, applicationId: string): Promise<Response> => {
  
  // Parse request body
  const requestBody = body as { reason?: string };
  if (!requestBody?.reason) {
    return new Response(JSON.stringify({ message: 'Rejection reason is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Check if application exists and is in Submitted status
  const application = await db.selectFrom('sms_op.applications')
    .selectAll()
    .where('id', '=', applicationId)
    .executeTakeFirst();

  if (!application) {
    return new Response(JSON.stringify({ message: 'Application not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Handle case where status might be null (defensive programming)
  const currentStatus = application.status || 'Draft';
  if (currentStatus !== 'Submitted') {
    return new Response(JSON.stringify({ message: 'Only submitted applications can be rejected' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Update application status to Rejected
  await db.updateTable('sms_op.applications')
    .set({ 
      status: 'Rejected', 
      updated_at: new Date()
    })
    .where('id', '=', applicationId)
    .execute();

  return new Response(JSON.stringify({
    message: "Application rejected successfully.",
    applicationId,
    reason: requestBody.reason
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// --- List Draft Applications Logic ---
const listDraftApplicationsLogic = async (req: Request, _ctx: ApiContext): Promise<Response> => {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const search = url.searchParams.get('search') || undefined;
  const offset = (page - 1) * limit;

  // Get total count for pagination
  let countQuery = db.selectFrom('sms_op.applications')
    .select((eb: ExpressionBuilder<DB, 'sms_op.applications'>) => eb.fn.count('id').as('total'))
    .where('status', '=', 'Draft');

  // Apply search filter to count query
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
  let query = db.selectFrom('sms_op.applications')
    .selectAll()
    .where('status', '=', 'Draft');

  // Apply search filter to main query
  if (search) {
    const searchPattern = `%${search}%`;
    query = query.where(sql<SqlBool>`(
      jsonb_extract_path_text(application_payload, 'personalDetails', 'firstName') ILIKE ${searchPattern} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'lastName') ILIKE ${searchPattern} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'primaryEmail') ILIKE ${searchPattern}
    )`);
  }

  const applications = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute();

  // Transform to ApplicationSummary format
  const applicationSummaries: ApplicationSummary[] = applications.map(app => {
    const payload = app.application_payload as Record<string, unknown>;
    const personalDetails = payload.personalDetails as Record<string, unknown>;
    const enrolmentDetails = payload.enrolmentDetails as Record<string, unknown>;
    
    const firstName = personalDetails?.firstName as string || '';
    const lastName = personalDetails?.lastName as string || '';
    const clientName = `${firstName} ${lastName}`.trim() || 'Unknown';
    
    return {
      id: app.id,
      status: app.status as "Draft" | "Submitted" | "Approved" | "Rejected",
      clientName,
      clientEmail: personalDetails?.primaryEmail as string || '',
      programName: enrolmentDetails?.programName as string || null,
      agentName: null, // Not available in current schema
      createdAt: app.created_at.toISOString(),
      updatedAt: app.updated_at.toISOString(),
      createdClientId: app.created_client_id,
      createdEnrolmentId: app.created_enrolment_id
    };
  });

  const totalPages = Math.ceil(total / limit);
  const response: ApplicationListResponse = {
    data: applicationSummaries,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    }
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};

// --- List Submitted Applications Logic ---
const listSubmittedApplicationsLogic = async (req: Request, _ctx: ApiContext): Promise<Response> => {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const search = url.searchParams.get('search') || undefined;
  const offset = (page - 1) * limit;

  // Get total count for pagination
  let countQuery = db.selectFrom('sms_op.applications')
    .select((eb: ExpressionBuilder<DB, 'sms_op.applications'>) => eb.fn.count('id').as('total'))
    .where('status', '=', 'Submitted');

  // Apply search filter to count query
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
  let query = db.selectFrom('sms_op.applications')
    .selectAll()
    .where('status', '=', 'Submitted');

  // Apply search filter to main query
  if (search) {
    const searchPattern = `%${search}%`;
    query = query.where(sql<SqlBool>`(
      jsonb_extract_path_text(application_payload, 'personalDetails', 'firstName') ILIKE ${searchPattern} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'lastName') ILIKE ${searchPattern} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'primaryEmail') ILIKE ${searchPattern}
    )`);
  }

  const applications = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute();

  // Transform to ApplicationSummary format
  const applicationSummaries: ApplicationSummary[] = applications.map(app => {
    const payload = app.application_payload as Record<string, unknown>;
    const personalDetails = payload.personalDetails as Record<string, unknown>;
    const enrolmentDetails = payload.enrolmentDetails as Record<string, unknown>;
    
    const firstName = personalDetails?.firstName as string || '';
    const lastName = personalDetails?.lastName as string || '';
    const clientName = `${firstName} ${lastName}`.trim() || 'Unknown';
    
    return {
      id: app.id,
      status: app.status as "Draft" | "Submitted" | "Approved" | "Rejected",
      clientName,
      clientEmail: personalDetails?.primaryEmail as string || '',
      programName: enrolmentDetails?.programName as string || null,
      agentName: null, // Not available in current schema
      createdAt: app.created_at.toISOString(),
      updatedAt: app.updated_at.toISOString(),
      createdClientId: app.created_client_id,
      createdEnrolmentId: app.created_enrolment_id
    };
  });

  const totalPages = Math.ceil(total / limit);
  const response: ApplicationListResponse = {
    data: applicationSummaries,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    }
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};

// --- List Approved Applications Logic ---
const listApprovedApplicationsLogic = async (req: Request, _ctx: ApiContext): Promise<Response> => {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const search = url.searchParams.get('search') || undefined;
  const offset = (page - 1) * limit;

  // Get total count for pagination
  let countQuery = db.selectFrom('sms_op.applications')
    .select((eb: ExpressionBuilder<DB, 'sms_op.applications'>) => eb.fn.count('id').as('total'))
    .where('status', '=', 'Approved');

  // Apply search filter to count query
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
  let query = db.selectFrom('sms_op.applications')
    .selectAll()
    .where('status', '=', 'Approved');

  // Apply search filter to main query
  if (search) {
    const searchPattern = `%${search}%`;
    query = query.where(sql<SqlBool>`(
      jsonb_extract_path_text(application_payload, 'personalDetails', 'firstName') ILIKE ${searchPattern} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'lastName') ILIKE ${searchPattern} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'primaryEmail') ILIKE ${searchPattern}
    )`);
  }

  const applications = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute();

  // Transform to ApplicationSummary format
  const applicationSummaries: ApplicationSummary[] = applications.map(app => {
    const payload = app.application_payload as Record<string, unknown>;
    const personalDetails = payload.personalDetails as Record<string, unknown>;
    const enrolmentDetails = payload.enrolmentDetails as Record<string, unknown>;
    
    const firstName = personalDetails?.firstName as string || '';
    const lastName = personalDetails?.lastName as string || '';
    const clientName = `${firstName} ${lastName}`.trim() || 'Unknown';
    
    return {
      id: app.id,
      status: app.status as "Draft" | "Submitted" | "Approved" | "Rejected",
      clientName,
      clientEmail: personalDetails?.primaryEmail as string || '',
      programName: enrolmentDetails?.programName as string || null,
      agentName: null, // Not available in current schema
      createdAt: app.created_at.toISOString(),
      updatedAt: app.updated_at.toISOString(),
      createdClientId: app.created_client_id,
      createdEnrolmentId: app.created_enrolment_id
    };
  });

  const totalPages = Math.ceil(total / limit);
  const response: ApplicationListResponse = {
    data: applicationSummaries,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    }
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};

// --- List Awaiting Payment Applications Logic ---
const listAwaitingPaymentApplicationsLogic = async (req: Request, _ctx: ApiContext): Promise<Response> => {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const search = url.searchParams.get('search') || undefined;
  const offset = (page - 1) * limit;

  let countQuery = db.selectFrom('sms_op.applications')
    .select((eb: ExpressionBuilder<DB, 'sms_op.applications'>) => eb.fn.count('id').as('total'))
    .where('status', '=', 'AwaitingPayment');
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

  let query = db.selectFrom('sms_op.applications').selectAll().where('status', '=', 'AwaitingPayment');
  if (search) {
    const searchPattern = `%${search}%`;
    query = query.where(sql<SqlBool>`(
      jsonb_extract_path_text(application_payload, 'personalDetails', 'firstName') ILIKE ${searchPattern} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'lastName') ILIKE ${searchPattern} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'primaryEmail') ILIKE ${searchPattern}
    )`);
  }
  const applications = await query.orderBy('created_at', 'desc').limit(limit).offset(offset).execute();
  const data = applications.map((row: any) => ({
    id: row.id,
    status: row.status,
    clientName: `${row.application_payload?.personalDetails?.firstName ?? ''} ${row.application_payload?.personalDetails?.lastName ?? ''}`.trim(),
    clientEmail: row.application_payload?.personalDetails?.primaryEmail ?? '',
    programName: row.application_payload?.enrolmentDetails?.programName ?? undefined,
    createdAt: row.created_at,
  }));
  return new Response(JSON.stringify({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: offset + limit < total, hasPrevious: page > 1 } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// --- List Accepted Applications Logic ---
const listAcceptedApplicationsLogic = async (req: Request, _ctx: ApiContext): Promise<Response> => {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const search = url.searchParams.get('search') || undefined;
  const offset = (page - 1) * limit;
  let countQuery = db.selectFrom('sms_op.applications')
    .select((eb: ExpressionBuilder<DB, 'sms_op.applications'>) => eb.fn.count('id').as('total'))
    .where('status', '=', 'Accepted');
  if (search) {
    const sp = `%${search}%`;
    countQuery = countQuery.where(sql<SqlBool>`(
      jsonb_extract_path_text(application_payload, 'personalDetails', 'firstName') ILIKE ${sp} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'lastName') ILIKE ${sp} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'primaryEmail') ILIKE ${sp}
    )`);
  }
  const totalResult = await countQuery.executeTakeFirst();
  const total = Number(totalResult?.total || 0);
  let query = db.selectFrom('sms_op.applications').selectAll().where('status', '=', 'Accepted');
  if (search) {
    const sp = `%${search}%`;
    query = query.where(sql<SqlBool>`(
      jsonb_extract_path_text(application_payload, 'personalDetails', 'firstName') ILIKE ${sp} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'lastName') ILIKE ${sp} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'primaryEmail') ILIKE ${sp}
    )`);
  }
  const applications = await query.orderBy('created_at', 'desc').limit(limit).offset(offset).execute();
  const data = applications.map((row: any) => ({
    id: row.id,
    status: row.status,
    clientName: `${row.application_payload?.personalDetails?.firstName ?? ''} ${row.application_payload?.personalDetails?.lastName ?? ''}`.trim(),
    clientEmail: row.application_payload?.personalDetails?.primaryEmail ?? '',
    programName: row.application_payload?.enrolmentDetails?.programName ?? undefined,
    createdAt: row.created_at,
  }));
  return new Response(JSON.stringify({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: offset + limit < total, hasPrevious: page > 1 } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// --- List Rejected Applications Logic ---
const listRejectedApplicationsLogic = async (req: Request, _ctx: ApiContext): Promise<Response> => {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const search = url.searchParams.get('search') || undefined;
  const offset = (page - 1) * limit;
  let countQuery = db.selectFrom('sms_op.applications')
    .select((eb: ExpressionBuilder<DB, 'sms_op.applications'>) => eb.fn.count('id').as('total'))
    .where('status', '=', 'Rejected');
  if (search) {
    const sp = `%${search}%`;
    countQuery = countQuery.where(sql<SqlBool>`(
      jsonb_extract_path_text(application_payload, 'personalDetails', 'firstName') ILIKE ${sp} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'lastName') ILIKE ${sp} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'primaryEmail') ILIKE ${sp}
    )`);
  }
  const totalResult = await countQuery.executeTakeFirst();
  const total = Number(totalResult?.total || 0);
  let query = db.selectFrom('sms_op.applications').selectAll().where('status', '=', 'Rejected');
  if (search) {
    const sp = `%${search}%`;
    query = query.where(sql<SqlBool>`(
      jsonb_extract_path_text(application_payload, 'personalDetails', 'firstName') ILIKE ${sp} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'lastName') ILIKE ${sp} OR
      jsonb_extract_path_text(application_payload, 'personalDetails', 'primaryEmail') ILIKE ${sp}
    )`);
  }
  const applications = await query.orderBy('created_at', 'desc').limit(limit).offset(offset).execute();
  const data = applications.map((row: any) => ({
    id: row.id,
    status: row.status,
    clientName: `${row.application_payload?.personalDetails?.firstName ?? ''} ${row.application_payload?.personalDetails?.lastName ?? ''}`.trim(),
    clientEmail: row.application_payload?.personalDetails?.primaryEmail ?? '',
    programName: row.application_payload?.enrolmentDetails?.programName ?? undefined,
    createdAt: row.created_at,
  }));
  return new Response(JSON.stringify({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: offset + limit < total, hasPrevious: page > 1 } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};
// --- Get Application Statistics Logic ---
const getApplicationStatsLogic = async (_req: Request, _ctx: ApiContext): Promise<Response> => {
  // Get counts by status
  const statusCounts = await db.selectFrom('sms_op.applications')
    .select([
      'status',
      (eb: ExpressionBuilder<DB, 'sms_op.applications'>) => eb.fn.count('id').as('count')
    ])
    .groupBy('status')
    .execute();

  // Get total count
  const totalResult = await db.selectFrom('sms_op.applications')
    .select((eb: ExpressionBuilder<DB, 'sms_op.applications'>) => eb.fn.count('id').as('total'))
    .executeTakeFirst();

  const total = Number(totalResult?.total || 0);

  // Get recent submissions (last 7 days) - using created_at as proxy
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentSubmissionsResult = await db.selectFrom('sms_op.applications')
    .select((eb: ExpressionBuilder<DB, 'sms_op.applications'>) => eb.fn.count('id').as('count'))
    .where('status', '=', 'Submitted')
    .where('created_at', '>=', sevenDaysAgo)
    .executeTakeFirst();

  const recentSubmissions = Number(recentSubmissionsResult?.count || 0);

  // Calculate average processing time - simplified since we don't have submission/approval timestamps
  // Using created_at to updated_at as a proxy for processing time
  const processingTimeResult = await db.selectFrom('sms_op.applications')
    .select([
      sql<number>`AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))`.as('avg_seconds')
    ])
    .where('status', '=', 'Approved')
    .executeTakeFirst();

  const avgProcessingTimeSeconds = Number(processingTimeResult?.avg_seconds || 0);
  const averageProcessingTime = avgProcessingTimeSeconds / 3600; // Convert to hours

  // Calculate completion rate
  const approvedCount = statusCounts.find(s => s.status === 'Approved')?.count || 0;
  const completionRate = total > 0 ? (Number(approvedCount) / total) * 100 : 0;

  // Build response
  const stats = {
    totalApplications: total,
    draftCount: Number(statusCounts.find(s => s.status === 'Draft')?.count || 0),
    submittedCount: Number(statusCounts.find(s => s.status === 'Submitted')?.count || 0),
    approvedCount: Number(statusCounts.find(s => s.status === 'Approved')?.count || 0),
    rejectedCount: Number(statusCounts.find(s => s.status === 'Rejected')?.count || 0),
    recentSubmissions,
    averageProcessingTime: Math.round(averageProcessingTime * 100) / 100, // Round to 2 decimal places
    completionRate: Math.round(completionRate * 100) / 100 // Round to 2 decimal places
  };

  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};

// --- Offer Letter Generation ---
const generateOfferLetterLogic = async (_req: Request, _ctx: ApiContext, applicationId: string): Promise<Response> => {
  // Fetch application
  const app = await db.selectFrom('sms_op.applications')
    .selectAll()
    .where('id', '=', applicationId)
    .executeTakeFirst();
  if (!app) throw new NotFoundError('Application not found.');

  // Render HTML from template and upload HTML + placeholder PDF
  const bucket = 'student-docs';
  const version = `v${new Date().toISOString().slice(0,10)}`;
  const htmlObjectPath = `applications/${applicationId}/offer-letter/${version}/offer.html`;
  const pdfObjectPath = `applications/${applicationId}/offer-letter/${version}/offer.pdf`;
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Build HTML by loading the template robustly (support different bundle layouts)
  let tpl = '';
  const candidateUrls = [
    new URL('./templates/offer_letter.html', import.meta.url),
    new URL('../_shared/templates/offer_letter.html', import.meta.url),
  ];
  for (const url of candidateUrls) {
    try {
      tpl = await Deno.readTextFile(url);
      if (tpl) break;
    } catch (_) {
      // try next location
    }
  }
  if (!tpl) {
    // Fallback minimal template to avoid runtime failure
    tpl = `<!doctype html><html><head><meta charset="utf-8"><title>Offer Letter</title></head><body><h1>Offer Letter</h1><p>{student.fullName}</p><p>Program: {program.name}</p><p>Generated on {generatedAt}</p></body></html>`;
  }
  const payload = app.application_payload as any;
  const personal = payload?.personalDetails ?? {};
  const enrol = payload?.enrolmentDetails ?? {};
  const paymentPlan = payload?.paymentPlan ?? {};
  const schedule = Array.isArray(paymentPlan?.schedule) ? paymentPlan.schedule : [];

  const replacements: Record<string, string> = {
    '{{offer_letter_id}}': crypto.randomUUID(),
    '{{date}}': new Date().toISOString().slice(0,10),
    '{{student_full_name}}': `${personal.firstName ?? ''} ${personal.lastName ?? ''}`.trim(),
    '{{student_first_name}}': personal.firstName ?? '',
    '{{student_address_line_1}}': `${payload?.address?.residential?.street_number ?? ''} ${payload?.address?.residential?.street_name ?? ''}`.trim(),
    '{{student_address_line_2}}': `${payload?.address?.residential?.suburb ?? ''} ${payload?.address?.residential?.state ?? ''} ${payload?.address?.residential?.postcode ?? ''}`.trim(),
    '{{agency_name}}': payload?.agentName ?? '',
    '{{course_cricos_code}}': enrol?.courseCricosCode ?? '',
    '{{course_code}}': enrol?.courseCode ?? '',
    '{{course_name}}': enrol?.courseName ?? '',
    '{{course_start_date}}': enrol?.startDate ?? '',
    '{{course_end_date}}': enrol?.expectedCompletionDate ?? enrol?.endDate ?? '',
    '{{course_location}}': payload?.enrolmentDetails?.locationName ?? '',
    '{{total_course_fees}}': String(paymentPlan?.tuitionFeeSnapshot ?? 0),
  };
  let html = tpl;
  for (const [k, v] of Object.entries(replacements)) {
    html = html.split(k).join(v);
  }
  // Simple schedule loop replacement
  const rowTpl = '<tr>\n                    <td>{{dueDate}}</td>\n                    <td>{{description}}</td>\n                    <td class="amount">${{amount}}</td>\n                </tr>';
  const rows = schedule.map((it: any) => rowTpl.replace('{{dueDate}}', it.dueDate).replace('{{description}}', it.description).replace('{{amount}}', String(it.amount))).join('\n');
  html = html.replace('{{#each schedule}}\n                <tr>\n                    <td>{{dueDate}}</td>\n                    <td>{{description}}</td>\n                    <td class="amount">${{amount}}</td>\n                </tr>\n                {{/each}}', rows);
  const placeholderPdf = new Uint8Array([
    0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A, // %PDF-1.4\n
    0x25,0xE2,0xE3,0xCF,0xD3,0x0A,
    0x31,0x20,0x30,0x20,0x6F,0x62,0x6A,0x0A, // 1 0 obj
    0x3C,0x3C,0x2F,0x54,0x79,0x70,0x65,0x2F,0x43,0x61,0x74,0x61,0x6C,0x6F,0x67,0x3E,0x3E,0x0A,
    0x65,0x6E,0x64,0x6F,0x62,0x6A,0x0A, // endobj
    0x78,0x72,0x65,0x66,0x0A,0x30,0x20,0x30,0x20,0x6F,0x62,0x6A,0x0A, // xref 0 0 obj
    0x65,0x6E,0x64,0x78,0x72,0x65,0x66,0x0A, // endxref
    0x74,0x72,0x61,0x69,0x6C,0x65,0x72,0x0A, // trailer
    0x25,0x25,0x45,0x4F,0x46,0x0A // %%EOF
  ]);

  let uploadedHtml = false;
  let uploadedPdf = false;
  if (supabaseUrl && serviceKey) {
    try {
      const uploadHtmlUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${htmlObjectPath}`;
      const respHtml = await fetch(uploadHtmlUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'text/html; charset=utf-8',
          'x-upsert': 'true',
        },
        body: new TextEncoder().encode(html),
      });
      if (!respHtml.ok) {
        console.warn('[OFFER_UPLOAD_WARNING_HTML]', respHtml.status, await respHtml.text());
      } else {
        uploadedHtml = true;
      }

      const uploadPdfUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${pdfObjectPath}`;
      const respPdf = await fetch(uploadPdfUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/pdf',
          'x-upsert': 'true',
        },
        body: placeholderPdf,
      });
      if (!respPdf.ok) {
        const errText = await respPdf.text();
        console.warn('[OFFER_UPLOAD_WARNING_PDF]', respPdf.status, errText);
      } else {
        uploadedPdf = true;
      }
    } catch (e) {
      console.warn('[OFFER_UPLOAD_WARNING] exception uploading to storage', e);
    }
  } else {
    console.warn('[OFFER_UPLOAD_WARNING] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set; skipping upload');
  }

  // Record HTML artifact
  if (uploadedHtml) {
    await db
      .insertInto('sms_op.application_documents')
      .values({
        // @ts-ignore
        application_id: applicationId,
        path: `${bucket}/${htmlObjectPath}`,
        doc_type: 'OFFER_LETTER',
        version: `${version}-html`,
        mime_type: 'text/html',
        size_bytes: String(new TextEncoder().encode(html).byteLength) as unknown as number,
      })
      .execute();
  }

  // Insert metadata row
  await db
    .insertInto('sms_op.application_documents')
    .values({
      // @ts-ignore: fields are inferred from DB types
      application_id: applicationId,
      path: `${bucket}/${pdfObjectPath}`,
      doc_type: 'OFFER_LETTER',
      version,
      mime_type: 'application/pdf',
      size_bytes: String(uploadedPdf ? placeholderPdf.byteLength : 0) as unknown as number,
    })
    .execute();

  const result = { pathHtml: `${bucket}/${htmlObjectPath}`, pathPdf: `${bucket}/${pdfObjectPath}`, version, createdAt: new Date().toISOString() };
  return new Response(JSON.stringify(result), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// --- Structured transition log helper ---
function logTransition(event: string, data: Record<string, unknown>) {
  try {
    console.log(JSON.stringify({ event, timestamp: new Date().toISOString(), ...data }));
  } catch {}
}

// --- Send Offer Letter ---
const sendOfferLetterLogic = async (req: Request, _ctx: ApiContext, applicationId: string): Promise<Response> => {
  // Ensure there is an offer letter document
  const doc = await db.selectFrom('sms_op.application_documents')
    .selectAll()
    .where('application_id', '=', applicationId)
    .where('doc_type', '=', 'OFFER_LETTER')
    .orderBy('created_at', 'desc')
    .executeTakeFirst();
  if (!doc) {
    throw new ValidationError('Offer letter has not been generated for this application.');
  }

  // Resolve recipient email from application payload
  const appRow = await db.selectFrom('sms_op.applications')
    .select(['application_payload'])
    .where('id', '=', applicationId)
    .executeTakeFirst();
  const payload = (appRow?.application_payload ?? {}) as any;
  const toEmail = payload?.personalDetails?.primaryEmail;
  if (!toEmail) {
    throw new ValidationError('Recipient email is missing in application personal details.');
  }

  // Fetch attachment (prefer PDF)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    throw new ValidationError('Storage credentials are not configured on the server.');
  }

  const attachmentUrl = `${supabaseUrl}/storage/v1/object/${doc.path}`;
  const attResp = await fetch(attachmentUrl, { headers: { Authorization: `Bearer ${serviceKey}` } });
  if (!attResp.ok) {
    throw new ValidationError('Failed to fetch offer letter from storage for emailing.');
  }
  const attBuf = new Uint8Array(await attResp.arrayBuffer());
  const b64 = btoa(String.fromCharCode(...attBuf));
  const fileName = doc.path.split('/').pop() || 'offer.pdf';
  const mimeType = doc.mime_type || 'application/pdf';

  // Prepare email via Resend
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM') || 'no-reply@example.com';
  const replyTo = Deno.env.get('EMAIL_REPLY_TO') || undefined;
  const bccDefault = Deno.env.get('EMAIL_BCC_DEFAULT') || undefined;
  if (!resendKey) {
    throw new ValidationError('RESEND_API_KEY is not configured.');
  }

  // Build a simple HTML body
  const subject = `Offer Letter`;
  const htmlBody = `<p>Please find attached your offer letter.</p>`;

  const idempotencyKey = req.headers.get('Idempotency-Key') || undefined;
  const emailResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [toEmail],
      ...(bccDefault ? { bcc: [bccDefault] } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: fileName,
          content: b64,
          path: undefined,
          type: mimeType,
        },
      ],
    }),
  });

  if (!emailResp.ok) {
    const errText = await emailResp.text();
    return new Response(JSON.stringify({ message: 'Email provider error', details: errText }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Transition to AwaitingPayment on success
  await db.updateTable('sms_op.applications')
    .set({ status: 'AwaitingPayment', updated_at: new Date() })
    .where('id', '=', applicationId)
    .execute();

  const providerResult = await emailResp.json();
  logTransition('APPLICATION_STATUS_CHANGED', { applicationId, from: 'Submitted', to: 'AwaitingPayment', via: 'send-offer', idempotencyKey });
  return new Response(JSON.stringify({ message: 'Offer letter sent. Status transitioned to AwaitingPayment.', providerResult, transition: { from: 'Submitted', to: 'AwaitingPayment' } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// --- Accept Application ---
const acceptApplicationLogic = async (_req: Request, _ctx: ApiContext, applicationId: string): Promise<Response> => {
  const app = await db.selectFrom('sms_op.applications')
    .select(['id','status'])
    .where('id', '=', applicationId)
    .executeTakeFirst();
  if (!app) throw new NotFoundError('Application not found.');

  // Idempotent: if already Accepted, return success
  if (app.status === 'Accepted') {
    return new Response(JSON.stringify({ message: 'Application already accepted.', transition: { from: 'Accepted', to: 'Accepted' } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Allow Accept from Submitted or AwaitingPayment for now
  if (!['Submitted','AwaitingPayment'].includes(app.status)) {
    throw new ValidationError(`Cannot accept application from status '${app.status}'.`);
  }

  await db.updateTable('sms_op.applications')
    .set({ status: 'Accepted', updated_at: new Date() })
    .where('id', '=', applicationId)
    .execute();

  logTransition('APPLICATION_STATUS_CHANGED', { applicationId, from: app.status, to: 'Accepted' });
  return new Response(JSON.stringify({ message: 'Application accepted.', transition: { from: app.status, to: 'Accepted' } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// --- Mark Awaiting Payment without sending email ---
const markAwaitingPaymentLogic = async (_req: Request, _ctx: ApiContext, applicationId: string): Promise<Response> => {
  // Ensure there is an offer letter document
  const doc = await db.selectFrom('sms_op.application_documents')
    .selectAll()
    .where('application_id', '=', applicationId)
    .where('doc_type', '=', 'OFFER_LETTER')
    .orderBy('created_at', 'desc')
    .executeTakeFirst();
  if (!doc) {
    throw new ValidationError('Offer letter has not been generated for this application.');
  }
  await db.updateTable('sms_op.applications')
    .set({ status: 'AwaitingPayment', updated_at: new Date() })
    .where('id', '=', applicationId)
    .execute();
  logTransition('APPLICATION_STATUS_CHANGED', { applicationId, to: 'AwaitingPayment', via: 'manual' });
  return new Response(JSON.stringify({ message: 'Application marked as AwaitingPayment.', transition: { to: 'AwaitingPayment' } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// --- List Application Documents ---
const listApplicationDocumentsLogic = async (_req: Request, _ctx: ApiContext, applicationId: string): Promise<Response> => {
  const rows = await db.selectFrom('sms_op.application_documents')
    .selectAll()
    .where('application_id', '=', applicationId)
    .orderBy('created_at', 'desc')
    .execute();
  return new Response(JSON.stringify({ data: rows }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// --- Upload CoE (PDF) and record metadata ---
const uploadCoeLogic = async (req: Request, _ctx: ApiContext, applicationId: string): Promise<Response> => {
  // Validate application exists (avoid FK 23503)
  const app = await db.selectFrom('sms_op.applications')
    .select(['id','status'])
    .where('id', '=', applicationId)
    .executeTakeFirst();
  if (!app) {
    return new Response(JSON.stringify({ message: 'Application not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  // Optional: enforce only on Accepted
  if (app.status !== 'Accepted') {
    return new Response(JSON.stringify({ message: `CoE upload allowed only when status is 'Accepted'. Current: '${app.status}'.` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ message: 'Storage not configured.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const contentType = req.headers.get('Content-Type') || '';
  if (!contentType.startsWith('application/pdf')) {
    return new Response(JSON.stringify({ message: 'Only PDF is accepted for CoE.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const raw = new Uint8Array(await req.arrayBuffer());

  // Compute next version
  const existing = await db.selectFrom('sms_op.application_documents')
    .selectAll()
    .where('application_id', '=', applicationId)
    .where('doc_type', '=', 'COE')
    .execute();
  const nextVersion = `v${new Date().toISOString().slice(0,10)}`;
  const bucket = 'student-docs';
  const objectPath = `applications/${applicationId}/coe/${nextVersion}/coe.pdf`;

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
  const uploadResp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true',
    },
    body: raw,
  });
  if (!uploadResp.ok) {
    const errText = await uploadResp.text().catch(()=>'');
    return new Response(JSON.stringify({ message: 'Failed to upload CoE.', details: errText }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  await db.insertInto('sms_op.application_documents').values({
    // @ts-ignore
    application_id: applicationId,
    path: `${bucket}/${objectPath}`,
    doc_type: 'COE',
    version: nextVersion,
    mime_type: 'application/pdf',
    size_bytes: String(raw.byteLength) as unknown as number,
  }).execute();

  logTransition('APPLICATION_DOC_UPLOADED', { applicationId, docType: 'COE', version: nextVersion });
  return new Response(JSON.stringify({ message: 'CoE uploaded.', path: `${bucket}/${objectPath}`, version: nextVersion }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// --- Stream latest offer document (PDF preferred) ---
const streamLatestOfferDocumentLogic = async (_req: Request, _ctx: ApiContext, applicationId: string): Promise<Response> => {
  const doc = await db.selectFrom('sms_op.application_documents')
    .selectAll()
    .where('application_id', '=', applicationId)
    .where('doc_type', '=', 'OFFER_LETTER')
    .orderBy('created_at', 'desc')
    .executeTakeFirst();
  if (!doc) return new Response(JSON.stringify({ message: 'No offer letter found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return new Response(JSON.stringify({ message: 'Storage not configured.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const objUrl = `${supabaseUrl}/storage/v1/object/${doc.path}`;
  const resp = await fetch(objUrl, { headers: { Authorization: `Bearer ${serviceKey}` } });
  if (!resp.ok) return new Response(JSON.stringify({ message: 'Failed to fetch document.' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const buf = await resp.arrayBuffer();
  return new Response(buf, { status: 200, headers: { ...corsHeaders, 'Content-Type': doc.mime_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename=${doc.path.split('/').pop()}` } });
};

// --- Generate Upload URL for Document ---
const generateUploadUrlLogic = async (req: Request, _ctx: ApiContext, applicationId: string, body: unknown): Promise<Response> => {
  try {
    // Validate application exists
    const app = await db.selectFrom('sms_op.applications')
      .select(['id', 'status'])
      .where('id', '=', applicationId)
      .executeTakeFirst();
    if (!app) {
      return new Response(JSON.stringify({ message: 'Application not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  const { filename, contentType, category } = body as { filename: string; contentType: string; category: string };

  // Validate required fields
  if (!filename || !contentType || !category) {
    return new Response(JSON.stringify({ message: 'Missing required fields: filename, contentType, category' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Validate category
  const validCategories = ['EVIDENCE', 'OTHER', 'OFFER_LETTER', 'COE'];
  if (!validCategories.includes(category)) {
    return new Response(JSON.stringify({ message: `Invalid category. Must be one of: ${validCategories.join(', ')}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Validate file type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (!allowedTypes.includes(contentType)) {
    return new Response(JSON.stringify({ message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Use local Supabase URLs for development
  const supabaseUrl = 'http://127.0.0.1:54321';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

  // Generate unique filename to prevent conflicts
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueFilename = `${timestamp}_${sanitizedFilename}`;
  const objectPath = `applications/${applicationId}/uploads/${uniqueFilename}`;

  // Generate signed URL (1 hour expiration)
  const expiresIn = 3600; // 1 hour
  const uploadUrl = `${supabaseUrl}/storage/v1/object/student-docs/${objectPath}`;
  
  // For now, return the upload URL with service key (in production, use proper signed URLs)
  const headers = {
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': contentType,
    'x-upsert': 'true'
  };

  return new Response(JSON.stringify({
    uploadUrl,
    headers,
    objectPath,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in generateUploadUrlLogic:', error);
    return new Response(JSON.stringify({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
};

// --- Confirm Document Upload ---
const confirmDocumentUploadLogic = async (req: Request, _ctx: ApiContext, applicationId: string, body: unknown): Promise<Response> => {
  // Validate application exists
  const app = await db.selectFrom('sms_op.applications')
    .select(['id', 'status'])
    .where('id', '=', applicationId)
    .executeTakeFirst();
  if (!app) {
    return new Response(JSON.stringify({ message: 'Application not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { objectPath, size, hash } = body as { objectPath: string; size: number; hash?: string };

  if (!objectPath || !size) {
    return new Response(JSON.stringify({ message: 'Missing required fields: objectPath, size' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Validate file size (20MB limit)
  const maxSize = 20 * 1024 * 1024; // 20MB
  if (size > maxSize) {
    return new Response(JSON.stringify({ message: 'File too large. Maximum size is 20MB.' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Extract filename from objectPath
  const filename = objectPath.split('/').pop() || 'unknown';
  
  // Determine content type from filename
  const getContentType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop() || '';
    const typeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return typeMap[ext] || 'application/octet-stream';
  };

  const contentType = getContentType(filename);

  // Insert document metadata
  const docId = crypto.randomUUID();
  await db.insertInto('sms_op.application_documents').values({
    // @ts-ignore
    id: docId,
    application_id: applicationId,
    path: `student-docs/${objectPath}`,
    doc_type: 'EVIDENCE', // Default to EVIDENCE for user uploads
    version: `v${new Date().toISOString().slice(0, 10)}`,
    mime_type: contentType,
    size_bytes: String(size) as unknown as number,
  }).execute();

  logTransition('APPLICATION_DOC_UPLOADED', { applicationId, docId, docType: 'EVIDENCE', size });
  
  return new Response(JSON.stringify({
    id: docId,
    message: 'Document uploaded successfully',
    path: `student-docs/${objectPath}`,
    size,
    contentType
  }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// --- Delete Document ---
const deleteDocumentLogic = async (_req: Request, _ctx: ApiContext, applicationId: string, documentId: string): Promise<Response> => {
  // Validate application exists
  const app = await db.selectFrom('sms_op.applications')
    .select(['id', 'status'])
    .where('id', '=', applicationId)
    .executeTakeFirst();
  if (!app) {
    return new Response(JSON.stringify({ message: 'Application not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Get document details
  const doc = await db.selectFrom('sms_op.application_documents')
    .selectAll()
    .where('id', '=', documentId)
    .where('application_id', '=', applicationId)
    .executeTakeFirst();
  
  if (!doc) {
    return new Response(JSON.stringify({ message: 'Document not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Delete from storage
  const supabaseUrl = 'http://127.0.0.1:54321';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  if (supabaseUrl && serviceKey) {
    const deleteUrl = `${supabaseUrl}/storage/v1/object/${doc.path}`;
    const deleteResp = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${serviceKey}` }
    });
    
    if (!deleteResp.ok) {
      console.warn('[DOC_DELETE_WARNING] Failed to delete from storage:', deleteResp.status);
    }
  }

  // Delete from database
  await db.deleteFrom('sms_op.application_documents')
    .where('id', '=', documentId)
    .where('application_id', '=', applicationId)
    .execute();

  logTransition('APPLICATION_DOC_DELETED', { applicationId, documentId, docType: doc.doc_type });
  
  return new Response(JSON.stringify({ message: 'Document deleted successfully' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
    // Check specific status routes BEFORE generic ID route
    if (pathSegments.length === 2 && pathSegments[1] === 'drafts' && method === 'GET') {
      return await listDraftApplicationsLogic(req, ctx);
    }
    if (pathSegments.length === 2 && pathSegments[1] === 'submitted' && method === 'GET') {
      return await listSubmittedApplicationsLogic(req, ctx);
    }
    if (pathSegments.length === 2 && pathSegments[1] === 'awaiting' && method === 'GET') {
      return await listAwaitingPaymentApplicationsLogic(req, ctx);
    }
    if (pathSegments.length === 2 && pathSegments[1] === 'accepted' && method === 'GET') {
      return await listAcceptedApplicationsLogic(req, ctx);
    }
    if (pathSegments.length === 2 && pathSegments[1] === 'approved' && method === 'GET') {
      return await listApprovedApplicationsLogic(req, ctx);
    }
    if (pathSegments.length === 2 && pathSegments[1] === 'rejected' && method === 'GET') {
      return await listRejectedApplicationsLogic(req, ctx);
    }
    if (pathSegments.length === 2 && pathSegments[1] === 'stats' && method === 'GET') {
      return await getApplicationStatsLogic(req, ctx);
    }
    // Generic ID route - must come AFTER specific routes
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
    if (pathSegments.length === 2 && method === 'DELETE') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await deleteApplicationLogic(req, ctx, pathSegments[1]);
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
    if (pathSegments.length === 3 && pathSegments[2] === 'reject' && method === 'POST') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await rejectApplicationLogic(req, ctx, body, pathSegments[1]);
    }
    if (pathSegments.length === 3 && pathSegments[2] === 'offer-letter' && method === 'POST') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await generateOfferLetterLogic(req, ctx, pathSegments[1]);
    }
    if (pathSegments.length === 3 && pathSegments[2] === 'send-offer' && method === 'POST') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await sendOfferLetterLogic(req, ctx, pathSegments[1]);
    }
    if (pathSegments.length === 3 && pathSegments[2] === 'accept' && method === 'POST') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await acceptApplicationLogic(req, ctx, pathSegments[1]);
    }
    if (pathSegments.length === 3 && pathSegments[2] === 'mark-awaiting' && method === 'POST') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await markAwaitingPaymentLogic(req, ctx, pathSegments[1]);
    }
    if (pathSegments.length === 3 && pathSegments[0] === 'applications' && pathSegments[2] === 'documents' && method === 'GET') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await listApplicationDocumentsLogic(req, ctx, pathSegments[1]);
    }
    if (pathSegments.length === 3 && pathSegments[2] === 'coe' && method === 'POST') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await uploadCoeLogic(req, ctx, pathSegments[1]);
    }
    if (pathSegments.length === 3 && pathSegments[2] === 'offer-latest' && method === 'GET') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await streamLatestOfferDocumentLogic(req, ctx, pathSegments[1]);
    }
    // Document upload routes
    if (pathSegments.length === 4 && pathSegments[0] === 'applications' && pathSegments[2] === 'documents' && pathSegments[3] === 'upload-url' && method === 'POST') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await generateUploadUrlLogic(req, ctx, pathSegments[1], body);
    }
    if (pathSegments.length === 4 && pathSegments[0] === 'applications' && pathSegments[2] === 'documents' && pathSegments[3] === 'confirm' && method === 'POST') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await confirmDocumentUploadLogic(req, ctx, pathSegments[1], body);
    }
    if (pathSegments.length === 4 && pathSegments[0] === 'applications' && pathSegments[2] === 'documents' && method === 'DELETE') {
      const validationError = validateApplicationId(pathSegments[1]);
      if (validationError) return validationError;
      return await deleteDocumentLogic(req, ctx, pathSegments[1], pathSegments[3]);
    }
  }

  return new Response('Not Found', { status: 404, headers: corsHeaders });
};

const handler = createApiRoute(applicationsRouter);

serve(handler);

