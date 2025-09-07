// =============================================================================
// FILE:        course-offerings/index.ts
// PROJECT:     XPortal Student Management System (SMS)
// AUTHOR:      Lead Backend Engineer
//
// DESCRIPTION:
// Manages the "inventory" of the RTO: the specific course offerings or intakes
// that students can enrol in. Supports listing available offerings for a
// program and creating new ones.
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError, ValidationError} from '../_shared/errors.ts';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

// --- Validation Schema for creating a new Course Offering ---
const CreateOfferingSchema = z.object({
  programId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  deliveryLocationId: z.string().uuid().optional().nullable(),
  // trainer_id is deprecated in favor of session_trainers
  maxStudents: z.number().int().positive().optional().nullable(),
  status: z.enum(['Scheduled', 'Active', 'Completed', 'Cancelled']).default('Scheduled'),
}).superRefine((data, ctx) => {
  if (data.endDate <= data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'End date must be after the start date.',
    });
  }
});

// --- Logic: GET /course-offerings (list all) ---
const listAllOfferingsLogic = async (req: Request, _ctx: ApiContext) => {
  const offerings = await db.selectFrom('sms_op.course_offerings')
    .selectAll()
    .where('status', 'in', ['Scheduled', 'Active']) // Only show intakes that are open for enrolment
    .orderBy('start_date', 'asc')
    .execute();
  
  return new Response(JSON.stringify(offerings), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

// --- Logic: GET /course-offerings/{id} ---
const getOfferingByIdLogic = async (req: Request, _ctx: ApiContext, offeringId: string) => {
  const offering = await db.selectFrom('sms_op.course_offerings')
    .selectAll()
    .where('id', '=', offeringId)
    .executeTakeFirst();
  
  if (!offering) {
    throw new NotFoundError('Course offering not found');
  }
  
  return new Response(JSON.stringify(offering), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

// --- Logic: GET /programs/{programId}/offerings ---
const listOfferingsByProgramLogic = async (req: Request, _ctx: ApiContext, programId: string) => {
  const offerings = await db.selectFrom('sms_op.course_offerings')
    .selectAll()
    .where('program_id', '=', programId)
    .where('status', 'in', ['Scheduled', 'Active']) // Only show intakes that are open for enrolment
    .orderBy('start_date', 'asc')
    .execute();
  
  return new Response(JSON.stringify(offerings), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

// --- Logic: POST /course-offerings ---
const createOfferingLogic = async (req: Request, _ctx: ApiContext, body: unknown) => {
  const validatedPayload = CreateOfferingSchema.parse(body);

  const newOffering = await db.insertInto('sms_op.course_offerings')
    .values({
      program_id: validatedPayload.programId,
      start_date: validatedPayload.startDate,
      end_date: validatedPayload.endDate,
      delivery_location_id: validatedPayload.deliveryLocationId,
      max_students: validatedPayload.maxStudents,
      status: validatedPayload.status,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return new Response(JSON.stringify(newOffering), {
    status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

// --- Main Router ---
const courseOfferingsRouter = async (req: Request, ctx: ApiContext, body: unknown): Promise<Response> => {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  // Route: GET /course-offerings (list all)
  if (method === 'GET' && pathSegments.length === 1 && pathSegments[0] === 'course-offerings') {
    return await listAllOfferingsLogic(req, ctx);
  }

  // Route: GET /course-offerings/{id}
  if (method === 'GET' && pathSegments.length === 2 && pathSegments[0] === 'course-offerings') {
    return await getOfferingByIdLogic(req, ctx, pathSegments[1]);
  }

  // Route: GET /programs/{programId}/offerings
  if (method === 'GET' && pathSegments.length === 3 && pathSegments[0] === 'programs' && pathSegments[2] === 'offerings') {
    return await listOfferingsByProgramLogic(req, ctx, pathSegments[1]);
  }

  // Route: POST /course-offerings
  if (method === 'POST' && pathSegments.length === 1 && pathSegments[0] === 'course-offerings') {
    return await createOfferingLogic(req, ctx, body);
  }

  throw new NotFoundError();
};

const handler = createApiRoute(courseOfferingsRouter);
serve(handler);