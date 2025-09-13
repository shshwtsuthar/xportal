import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError, ValidationError } from '../_shared/errors.ts';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

// Fix Buffer type issues for Deno
declare global {
  const Buffer: {
    new (data?: any): any;
    isBuffer(obj: any): boolean;
  };
}

const PlanCreateSchema = z.object({
  name: z.string().min(1),
  version: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

const PlanSubjectsSchema = z.array(z.object({
  subject_id: z.string().uuid(),
  unit_type: z.enum(['Core','Elective']),
  sort_order: z.number().int().nonnegative().optional(),
  estimated_duration_weeks: z.number().int().positive().optional(),
  complexity_level: z.enum(['Basic', 'Intermediate', 'Advanced']).optional(),
}));

const PrerequisiteSchema = z.object({
  subject_id: z.string().uuid(),
  prerequisite_subject_id: z.string().uuid(),
  prerequisite_type: z.enum(['Required', 'Recommended']),
});

const PrerequisitesSchema = z.array(PrerequisiteSchema);

const ProgressionPreviewSchema = z.object({
  intake_model: z.enum(['Fixed', 'Rolling']),
  start_date: z.string().optional(),
  simulation_duration_weeks: z.number().int().positive().optional(),
});

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
        .values(payload.map((p) => ({ 
          plan_id: planId, 
          subject_id: p.subject_id, 
          unit_type: p.unit_type, 
          sort_order: p.sort_order ?? 0,
          estimated_duration_weeks: p.estimated_duration_weeks ?? 4,
          complexity_level: p.complexity_level ?? 'Basic'
        })))
        .execute();
    }
  });

  return new Response(JSON.stringify({ message: 'Updated' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// Get complete course plan structure with prerequisites
const getCoursePlanStructure = async (_req: Request, _ctx: ApiContext, programId: string, planId: string) => {
  const plan = await db.selectFrom('core.program_course_plans')
    .selectAll()
    .where('id', '=', planId)
    .where('program_id', '=', programId)
    .executeTakeFirst();
  
  if (!plan) throw new NotFoundError('Course plan not found');

  // Get subjects with enhanced details
  const subjects = await db.selectFrom('core.program_course_plan_subjects as ps')
    .innerJoin('core.subjects as s', 'ps.subject_id', 's.id')
    .select([
      's.id as subject_id',
      's.subject_identifier',
      's.subject_name',
      'ps.unit_type',
      'ps.sort_order',
      'ps.estimated_duration_weeks',
      'ps.complexity_level',
    ])
    .where('ps.plan_id', '=', planId)
    .orderBy('ps.unit_type', 'asc')
    .orderBy('ps.sort_order', 'asc')
    .execute();

  // Get prerequisites
  const prerequisites = await db.selectFrom('core.subject_prerequisites as sp')
    .innerJoin('core.subjects as s', 'sp.subject_id', 's.id')
    .innerJoin('core.subjects as prereq_s', 'sp.prerequisite_subject_id', 'prereq_s.id')
    .select([
      'sp.id',
      'sp.subject_id',
      'sp.prerequisite_subject_id',
      'sp.prerequisite_type',
      's.subject_name',
      'prereq_s.subject_name as prerequisite_subject_name',
      'sp.created_at',
    ])
    .where('sp.subject_id', 'in', subjects.map(s => s.subject_id))
    .execute();

  // Get validation results
  const validationResult = await validateProgression(planId);

  const structure = {
    plan,
    subjects: subjects.map(subject => ({
      ...subject,
      prerequisites_count: prerequisites.filter(p => p.subject_id === subject.subject_id).length,
      dependents_count: prerequisites.filter(p => p.prerequisite_subject_id === subject.subject_id).length,
    })),
    prerequisites,
    progression_validation: validationResult,
  };

  return new Response(JSON.stringify(structure), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// Get prerequisites for a course plan
const getCoursePlanPrerequisites = async (_req: Request, _ctx: ApiContext, programId: string, planId: string) => {
  const plan = await db.selectFrom('core.program_course_plans')
    .select(['id', 'program_id'])
    .where('id', '=', planId)
    .where('program_id', '=', programId)
    .executeTakeFirst();
  
  if (!plan) throw new NotFoundError('Course plan not found');

  const prerequisites = await db.selectFrom('core.subject_prerequisites as sp')
    .innerJoin('core.subjects as s', 'sp.subject_id', 's.id')
    .innerJoin('core.subjects as prereq_s', 'sp.prerequisite_subject_id', 'prereq_s.id')
    .select([
      'sp.id',
      'sp.subject_id',
      'sp.prerequisite_subject_id',
      'sp.prerequisite_type',
      's.subject_name',
      'prereq_s.subject_name as prerequisite_subject_name',
      'sp.created_at',
    ])
    .where('sp.subject_id', 'in', 
      db.selectFrom('core.program_course_plan_subjects')
        .select('subject_id')
        .where('plan_id', '=', planId)
    )
    .execute();

  return new Response(JSON.stringify(prerequisites), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// Update prerequisites for a course plan
const updateCoursePlanPrerequisites = async (_req: Request, _ctx: ApiContext, programId: string, planId: string, body: unknown) => {
  const payload = PrerequisitesSchema.parse(body);
  
  const plan = await db.selectFrom('core.program_course_plans')
    .select(['id', 'program_id'])
    .where('id', '=', planId)
    .where('program_id', '=', programId)
    .executeTakeFirst();
  
  if (!plan) throw new NotFoundError('Course plan not found');

  // Validate that all subjects belong to this plan
  const planSubjects = await db.selectFrom('core.program_course_plan_subjects')
    .select('subject_id')
    .where('plan_id', '=', planId)
    .execute();
  
  const planSubjectIds = new Set(planSubjects.map(s => s.subject_id));
  
  for (const prereq of payload) {
    if (!planSubjectIds.has(prereq.subject_id) || !planSubjectIds.has(prereq.prerequisite_subject_id)) {
      throw new ValidationError('All subjects must belong to the course plan');
    }
  }

  await db.transaction().execute(async (trx) => {
    // Delete existing prerequisites for subjects in this plan
    await trx.deleteFrom('core.subject_prerequisites')
      .where('subject_id', 'in', Array.from(planSubjectIds))
      .execute();
    
    // Insert new prerequisites
    if (payload.length > 0) {
      await trx.insertInto('core.subject_prerequisites')
        .values(payload.map(p => ({
          subject_id: p.subject_id,
          prerequisite_subject_id: p.prerequisite_subject_id,
          prerequisite_type: p.prerequisite_type,
        })))
        .execute();
    }
  });

  return new Response(JSON.stringify({ message: 'Prerequisites updated' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// Validate progression rules
const validateProgression = async (planId: string) => {
  // For now, we'll implement a simplified validation
  // In a real implementation, you'd use the PostgreSQL function
  const circularDeps: any[] = [];

  // Check for orphaned subjects (subjects that are prerequisites but not in the plan)
  const orphanedSubjects = await db.selectFrom('core.subject_prerequisites as sp')
    .leftJoin('core.program_course_plan_subjects as pcps', 'sp.prerequisite_subject_id', 'pcps.subject_id')
    .select(['sp.prerequisite_subject_id'])
    .where('pcps.plan_id', '=', planId)
    .where('pcps.subject_id', 'is', null)
    .execute();

  const errors = [];
  const warnings: any[] = [];

  if (circularDeps.length > 0) {
    errors.push({
      type: 'CircularDependency',
      message: 'Circular dependencies detected in prerequisites',
      subject_ids: circularDeps.map((dep: any) => dep.subject_id),
    });
  }

  if (orphanedSubjects.length > 0) {
    errors.push({
      type: 'OrphanedSubject',
      message: 'Subjects referenced as prerequisites but not in course plan',
      subject_ids: orphanedSubjects.map(s => s.prerequisite_subject_id),
    });
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
};

const validateCoursePlanProgression = async (_req: Request, _ctx: ApiContext, programId: string, planId: string) => {
  const plan = await db.selectFrom('core.program_course_plans')
    .select(['id', 'program_id'])
    .where('id', '=', planId)
    .where('program_id', '=', programId)
    .executeTakeFirst();
  
  if (!plan) throw new NotFoundError('Course plan not found');

  const validationResult = await validateProgression(planId);
  return new Response(JSON.stringify(validationResult), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// Preview progression for both intake models
const previewCoursePlanProgression = async (_req: Request, _ctx: ApiContext, programId: string, planId: string, body: unknown) => {
  const { intake_model, start_date, simulation_duration_weeks = 52 } = ProgressionPreviewSchema.parse(body);
  
  const plan = await db.selectFrom('core.program_course_plans')
    .select(['id', 'program_id', 'name'])
    .where('id', '=', planId)
    .where('program_id', '=', programId)
    .executeTakeFirst();
  
  if (!plan) throw new NotFoundError('Course plan not found');

  // For now, we'll implement a simplified progression calculation
  // In a real implementation, you'd use the PostgreSQL function
  const phases: any[] = [];

  // Calculate total duration
  const totalDuration = phases.reduce((sum: number, phase: any) => sum + (phase.estimated_end_week - phase.estimated_start_week), 0);

  // Generate timeline for Fixed intake
  const fixedIntakeTimeline = phases.flatMap((phase: any) => 
    phase.subject_ids.map((subjectId: string) => ({
      subject_id: subjectId,
      subject_name: `Subject ${subjectId}`, // Would need to join with subjects table
      start_week: phase.estimated_start_week,
      end_week: phase.estimated_end_week,
      duration_weeks: phase.estimated_end_week - phase.estimated_start_week,
      prerequisites_completed_by_week: phase.estimated_start_week - 1,
    }))
  );

  // Generate unlock sequence for Rolling intake
  const rollingIntakeSequence = phases.map((phase: any, index: number) => ({
    unlock_trigger: index === 0 ? 'Enrolment' : 'SubjectCompletion',
    subjects_unlocked: phase.subject_ids.map((subjectId: string) => ({
      subject_id: subjectId,
      subject_name: `Subject ${subjectId}`, // Would need to join with subjects table
      estimated_duration_weeks: phase.estimated_end_week - phase.estimated_start_week,
      prerequisite_subjects: index > 0 ? (phases[index - 1] as any).subject_ids : [],
    })),
  }));

  const result = {
    intake_model,
    total_duration_weeks: totalDuration,
    progression_phases: phases,
    fixed_intake_timeline: fixedIntakeTimeline,
    rolling_intake_sequence: rollingIntakeSequence,
  };

  return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

  // GET /programs/{programId}/course-plans/{planId}/structure
  if (m === 'GET' && p.length === 5 && p[0] === 'programs' && p[2] === 'course-plans' && p[4] === 'structure') {
    return getCoursePlanStructure(req, ctx, p[1], p[3]);
  }
  // Support: /course-plans/programs/{programId}/course-plans/{planId}/structure
  if (m === 'GET' && p.length === 6 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'course-plans' && p[5] === 'structure') {
    return getCoursePlanStructure(req, ctx, p[2], p[4]);
  }

  // GET /programs/{programId}/course-plans/{planId}/prerequisites
  if (m === 'GET' && p.length === 5 && p[0] === 'programs' && p[2] === 'course-plans' && p[4] === 'prerequisites') {
    return getCoursePlanPrerequisites(req, ctx, p[1], p[3]);
  }
  // Support: /course-plans/programs/{programId}/course-plans/{planId}/prerequisites
  if (m === 'GET' && p.length === 6 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'course-plans' && p[5] === 'prerequisites') {
    return getCoursePlanPrerequisites(req, ctx, p[2], p[4]);
  }

  // PUT /programs/{programId}/course-plans/{planId}/prerequisites
  if (m === 'PUT' && p.length === 5 && p[0] === 'programs' && p[2] === 'course-plans' && p[4] === 'prerequisites') {
    return updateCoursePlanPrerequisites(req, ctx, p[1], p[3], body);
  }
  // Support: /course-plans/programs/{programId}/course-plans/{planId}/prerequisites
  if (m === 'PUT' && p.length === 6 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'course-plans' && p[5] === 'prerequisites') {
    return updateCoursePlanPrerequisites(req, ctx, p[2], p[4], body);
  }

  // POST /programs/{programId}/course-plans/{planId}/validate-progression
  if (m === 'POST' && p.length === 5 && p[0] === 'programs' && p[2] === 'course-plans' && p[4] === 'validate-progression') {
    return validateCoursePlanProgression(req, ctx, p[1], p[3]);
  }
  // Support: /course-plans/programs/{programId}/course-plans/{planId}/validate-progression
  if (m === 'POST' && p.length === 6 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'course-plans' && p[5] === 'validate-progression') {
    return validateCoursePlanProgression(req, ctx, p[2], p[4]);
  }

  // POST /programs/{programId}/course-plans/{planId}/progression-preview
  if (m === 'POST' && p.length === 5 && p[0] === 'programs' && p[2] === 'course-plans' && p[4] === 'progression-preview') {
    return previewCoursePlanProgression(req, ctx, p[1], p[3], body);
  }
  // Support: /course-plans/programs/{programId}/course-plans/{planId}/progression-preview
  if (m === 'POST' && p.length === 6 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'course-plans' && p[5] === 'progression-preview') {
    return previewCoursePlanProgression(req, ctx, p[2], p[4], body);
  }

  throw new NotFoundError();
};

serve(createApiRoute(router));


