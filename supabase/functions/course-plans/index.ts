import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError, ValidationError } from '../_shared/errors.ts';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

const PlanCreateSchema = z.object({
  name: z.string().min(1),
  version: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

const PlanSubjectsSchema = z.array(z.object({
  subject_id: z.string().uuid(),
  unit_type: z.enum(['Core','Elective']),
  sort_order: z.number().int().nonnegative().optional(),
}));

const listPlans = async (_req: Request, _ctx: ApiContext, programId: string) => {
  const rows = await db.selectFrom('core.program_course_plans')
    .selectAll()
    .where('program_id', '=', programId)
    .orderBy('is_active', 'desc')
    .orderBy('created_at', 'desc')
    .execute();
  return new Response(JSON.stringify(rows), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const createPlan = async (_req: Request, _ctx: ApiContext, programId: string, body: unknown) => {
  const { name, version = 1, isActive = false } = PlanCreateSchema.parse(body);
  const created = await db.insertInto('core.program_course_plans')
    .values({ program_id: programId, name, version, is_active: isActive })
    .returningAll()
    .executeTakeFirstOrThrow();
  return new Response(JSON.stringify(created), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const getPlanSubjects = async (_req: Request, _ctx: ApiContext, programId: string, planId: string) => {
  // Verify plan belongs to program
  const plan = await db.selectFrom('core.program_course_plans').select(['id','program_id']).where('id','=',planId).executeTakeFirst();
  if (!plan || plan.program_id !== programId) throw new NotFoundError('Course plan not found');

  const subjects = await db.selectFrom('core.program_course_plan_subjects as ps')
    .innerJoin('core.subjects as s','ps.subject_id','s.id')
    .select([
      's.id as subject_id',
      's.subject_identifier',
      's.subject_name',
      'ps.unit_type',
      'ps.sort_order',
    ])
    .where('ps.plan_id','=',planId)
    .orderBy('ps.unit_type','asc')
    .orderBy('ps.sort_order','asc')
    .execute();
  return new Response(JSON.stringify(subjects), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const replacePlanSubjects = async (_req: Request, _ctx: ApiContext, programId: string, planId: string, body: unknown) => {
  const payload = PlanSubjectsSchema.parse(body);

  // Validate duplicates by subject_id before mutating DB
  const seen = new Map<string, number>();
  for (const item of payload) {
    seen.set(item.subject_id, (seen.get(item.subject_id) ?? 0) + 1);
  }
  const duplicates = Array.from(seen.entries())
    .filter(([, count]) => count > 1)
    .map(([subjectId]) => subjectId);
  if (duplicates.length > 0) {
    throw new ValidationError('Duplicate subjects in payload.', { subject_id: duplicates });
  }
  const plan = await db.selectFrom('core.program_course_plans').select(['id','program_id']).where('id','=',planId).executeTakeFirst();
  if (!plan || plan.program_id !== programId) throw new NotFoundError('Course plan not found');

  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom('core.program_course_plan_subjects').where('plan_id','=',planId).execute();
    if (payload.length > 0) {
      await trx.insertInto('core.program_course_plan_subjects')
        .values(payload.map((p) => ({ plan_id: planId, subject_id: p.subject_id, unit_type: p.unit_type, sort_order: p.sort_order ?? 0 })))
        .execute();
    }
  });

  return new Response(JSON.stringify({ message: 'Updated' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const router = async (req: Request, ctx: ApiContext, body: unknown) => {
  const url = new URL(req.url);
  const p = url.pathname.split('/').filter(Boolean);
  const m = req.method;

  // GET /programs/{programId}/course-plans
  if (m === 'GET' && p.length === 3 && p[0] === 'programs' && p[2] === 'course-plans') {
    return listPlans(req, ctx, p[1]);
  }
  // Support: /course-plans/programs/{programId}/course-plans
  if (m === 'GET' && p.length === 4 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'course-plans') {
    return listPlans(req, ctx, p[2]);
  }

  // POST /programs/{programId}/course-plans
  if (m === 'POST' && p.length === 3 && p[0] === 'programs' && p[2] === 'course-plans') {
    return createPlan(req, ctx, p[1], body);
  }
  // Support: /course-plans/programs/{programId}/course-plans
  if (m === 'POST' && p.length === 4 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'course-plans') {
    return createPlan(req, ctx, p[2], body);
  }

  // GET /programs/{programId}/course-plans/{planId}/subjects
  if (m === 'GET' && p.length === 5 && p[0] === 'programs' && p[2] === 'course-plans' && p[4] === 'subjects') {
    return getPlanSubjects(req, ctx, p[1], p[3]);
  }
  // Support: /course-plans/programs/{programId}/course-plans/{planId}/subjects
  if (m === 'GET' && p.length === 6 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'course-plans' && p[5] === 'subjects') {
    return getPlanSubjects(req, ctx, p[2], p[4]);
  }

  // PUT /programs/{programId}/course-plans/{planId}/subjects
  if (m === 'PUT' && p.length === 5 && p[0] === 'programs' && p[2] === 'course-plans' && p[4] === 'subjects') {
    return replacePlanSubjects(req, ctx, p[1], p[3], body);
  }
  // Support: /course-plans/programs/{programId}/course-plans/{planId}/subjects
  if (m === 'PUT' && p.length === 6 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'course-plans' && p[5] === 'subjects') {
    return replacePlanSubjects(req, ctx, p[2], p[4], body);
  }

  throw new NotFoundError();
};

serve(createApiRoute(router));


