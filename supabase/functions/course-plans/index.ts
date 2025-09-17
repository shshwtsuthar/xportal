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

// --- Rolling Schedule Schemas ---
const ProgramScheduleUnitSchema = z.object({
  subjectId: z.string().uuid(),
  orderIndex: z.number().int().min(0),
  durationDays: z.number().int().min(1),
});

const ProgramScheduleUpsertSchema = z.object({
  name: z.string().min(1).default('Default Rolling Schedule'),
  cycleAnchorDate: z.string(), // YYYY-MM-DD
  timezone: z.string().default('Australia/Melbourne'),
  units: z.array(ProgramScheduleUnitSchema).min(1),
});

const SchedulePreviewSchema = z.object({
  cycles: z.number().int().min(1).default(2),
  requestedStartDate: z.string().optional(),
  catchupMode: z.enum(['SequentialNextTerm', 'ParallelNextTerm']).optional(),
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

  // Get course plan subjects with their details
  const planSubjects = await db.selectFrom('core.program_course_plan_subjects as pcps')
    .innerJoin('core.subjects as s', 's.id', 'pcps.subject_id')
    .selectAll(['pcps', 's'])
    .where('pcps.plan_id', '=', planId)
    .orderBy('pcps.sort_order', 'asc')
    .execute();

  if (planSubjects.length === 0) {
    return new Response(JSON.stringify({
      intake_model,
      total_duration_weeks: 0,
      progression_phases: [],
      fixed_intake_timeline: [],
      rolling_intake_sequence: [],
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Calculate total duration
  const totalDuration = planSubjects.reduce((sum, subject) => sum + (subject.estimated_duration_weeks || 4), 0);

  // Generate progression phases (simplified - all subjects in one phase for now)
  const phases = [{
    phase_number: 1,
    subject_ids: planSubjects.map(s => s.subject_id),
    estimated_start_week: 1,
    estimated_end_week: totalDuration,
  }];

  // Generate timeline for Fixed intake with actual dates
  let currentWeek = 1;
  const startDate = new Date(start_date || new Date());
  
  const fixedIntakeTimeline = planSubjects.map((subject) => {
    const duration = subject.estimated_duration_weeks || 4;
    
    // Calculate actual dates
    const subjectStartDate = new Date(startDate);
    subjectStartDate.setDate(subjectStartDate.getDate() + (currentWeek - 1) * 7);
    
    const subjectEndDate = new Date(subjectStartDate);
    subjectEndDate.setDate(subjectEndDate.getDate() + (duration * 7) - 1);
    
    const timeline = {
      subject_id: subject.subject_id,
      subject_name: subject.subject_name,
      start_week: currentWeek,
      end_week: currentWeek + duration - 1,
      duration_weeks: duration,
      prerequisites_completed_by_week: currentWeek - 1,
      start_date: subjectStartDate.toISOString().split('T')[0],
      end_date: subjectEndDate.toISOString().split('T')[0],
    };
    currentWeek += duration;
    return timeline;
  });

  // Generate unlock sequence for Rolling intake with date estimates
  const rollingStartDate = new Date(start_date || new Date());
  
  const rollingIntakeSequence = [{
    unlock_trigger: 'Enrolment',
    subjects_unlocked: planSubjects.map((subject) => {
      const duration = subject.estimated_duration_weeks || 4;
      
      // For rolling intake, subjects can start immediately upon enrolment
      // but we'll show estimated completion dates
      const estimatedEndDate = new Date(rollingStartDate);
      estimatedEndDate.setDate(estimatedEndDate.getDate() + (duration * 7));
      
      return {
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        estimated_duration_weeks: duration,
        prerequisite_subjects: [], // Simplified - no prerequisites for now
        available_from_date: rollingStartDate.toISOString().split('T')[0],
        estimated_completion_date: estimatedEndDate.toISOString().split('T')[0],
      };
    }),
  }];

  const result = {
    intake_model,
    total_duration_weeks: totalDuration,
    progression_phases: phases,
    fixed_intake_timeline: fixedIntakeTimeline,
    rolling_intake_sequence: rollingIntakeSequence,
  };

  return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

// ---------------------------------------------
// Rolling Schedule Handlers
// ---------------------------------------------
const getProgramRollingSchedule = async (_req: Request, _ctx: ApiContext, programId: string) => {
  const schedule = await db.selectFrom('core.program_schedules')
    .selectAll()
    .where('program_id', '=', programId)
    .orderBy('created_at', 'desc')
    .executeTakeFirst();

  if (!schedule) {
    return new Response(JSON.stringify({
      id: null,
      program_id: programId,
      name: 'Default Rolling Schedule',
      cycle_anchor_date: null,
      timezone: 'Australia/Melbourne',
      units: [],
      created_at: null,
      updated_at: null,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const units = await db.selectFrom('core.program_schedule_units as u')
    .innerJoin('core.subjects as s', 's.id', 'u.subject_id')
    .select([
      'u.id', 'u.schedule_id', 'u.subject_id', 'u.order_index', 'u.duration_days',
      's.subject_name', 's.subject_identifier'
    ])
    .where('u.schedule_id', '=', schedule.id as string)
    .orderBy('u.order_index', 'asc')
    .execute();

  return new Response(JSON.stringify({
    id: schedule.id,
    program_id: schedule.program_id,
    name: schedule.name,
    cycle_anchor_date: schedule.cycle_anchor_date,
    timezone: schedule.timezone,
    units,
    created_at: schedule.created_at,
    updated_at: schedule.updated_at,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const validateProgramRollingSchedule = async (_req: Request, _ctx: ApiContext, _programId: string, body: unknown) => {
  const parsed = ProgramScheduleUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ isValid: false, errors: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })), warnings: [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const { units } = parsed.data;
  const errors: Array<{ field: string; message: string }> = [];
  // Unique orderIndex and subjectId
  const orderSet = new Set<number>();
  const subjectSet = new Set<string>();
  for (const u of units) {
    if (orderSet.has(u.orderIndex)) errors.push({ field: 'units.orderIndex', message: 'Duplicate orderIndex in units' });
    orderSet.add(u.orderIndex);
    if (subjectSet.has(u.subjectId)) errors.push({ field: 'units.subjectId', message: 'Duplicate subjectId in units' });
    subjectSet.add(u.subjectId);
  }
  return new Response(JSON.stringify({ isValid: errors.length === 0, errors, warnings: [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const upsertProgramRollingSchedule = async (_req: Request, _ctx: ApiContext, programId: string, body: unknown) => {
  const { name, cycleAnchorDate, timezone, units } = ProgramScheduleUpsertSchema.parse(body);

  // simple validation reuse
  const validation = await validateProgramRollingSchedule(_req, _ctx, programId, body);
  const { isValid, errors } = await validation.json();
  if (!isValid) throw new ValidationError('Invalid schedule', { errors });

  const existing = await db.selectFrom('core.program_schedules')
    .selectAll()
    .where('program_id', '=', programId)
    .orderBy('created_at', 'desc')
    .executeTakeFirst();

  const result = await db.transaction().execute(async (trx) => {
    let scheduleId: string;
    if (!existing) {
      const created = await trx.insertInto('core.program_schedules')
        .values({ program_id: programId, name, cycle_anchor_date: cycleAnchorDate as unknown as Date, timezone })
        .returningAll()
        .executeTakeFirstOrThrow();
      scheduleId = created.id as string;
    } else {
      const updated = await trx.updateTable('core.program_schedules')
        .set({ name, cycle_anchor_date: cycleAnchorDate as unknown as Date, timezone, updated_at: new Date() as unknown as Date })
        .where('id', '=', existing.id as string)
        .returningAll()
        .executeTakeFirstOrThrow();
      scheduleId = updated.id as string;
      await trx.deleteFrom('core.program_schedule_units').where('schedule_id', '=', scheduleId).execute();
    }
    if (units.length > 0) {
      await trx.insertInto('core.program_schedule_units')
        .values(units.map(u => ({ schedule_id: scheduleId, subject_id: u.subjectId, order_index: u.orderIndex, duration_days: u.durationDays })))
        .execute();
    }
    return scheduleId;
  });

  // Return the schedule
  const resp = await db.selectFrom('core.program_schedules').selectAll().where('id', '=', result).executeTakeFirstOrThrow();
  return new Response(JSON.stringify(resp), { status: existing ? 200 : 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const previewProgramRollingSchedule = async (_req: Request, _ctx: ApiContext, programId: string, body: unknown) => {
  const { cycles, requestedStartDate } = SchedulePreviewSchema.parse(body);
  const schedule = await db.selectFrom('core.program_schedules')
    .selectAll()
    .where('program_id', '=', programId)
    .orderBy('created_at', 'desc')
    .executeTakeFirst();
  if (!schedule) throw new NotFoundError('Rolling schedule not found');

  const units = await db.selectFrom('core.program_schedule_units as u')
    .innerJoin('core.subjects as s', 's.id', 'u.subject_id')
    .select(['u.subject_id', 's.subject_name', 'u.order_index', 'u.duration_days'])
    .where('u.schedule_id', '=', schedule.id as string)
    .orderBy('u.order_index', 'asc')
    .execute();

  // Build windows across cycles
  const anchor = new Date(schedule.cycle_anchor_date as unknown as string);
  const cycleLength = units.reduce((sum, u) => sum + u.duration_days, 0);
  const windows: Array<{ term_index: number; subject_id: string; subject_name: string; start_date: string; end_date: string }> = [];
  for (let term = 0; term < cycles; term++) {
    let dayOffset = term * cycleLength;
    for (const u of units) {
      const start = new Date(anchor);
      start.setDate(start.getDate() + dayOffset);
      const end = new Date(start);
      end.setDate(end.getDate() + u.duration_days - 1);
      windows.push({ term_index: term, subject_id: u.subject_id as string, subject_name: u.subject_name as string, start_date: start.toISOString().split('T')[0], end_date: end.toISOString().split('T')[0] });
      dayOffset += u.duration_days;
    }
  }

  // Optionally could align requestedStartDate, but business rule postponed
  return new Response(JSON.stringify({ cycle_anchor_date: schedule.cycle_anchor_date, timezone: schedule.timezone, cycles, windows }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const deriveCatchupForProgram = async (_req: Request, _ctx: ApiContext, programId: string, body: unknown) => {
  const { startUnitId, catchupMode } = z.object({ startUnitId: z.string().uuid(), catchupMode: z.enum(['SequentialNextTerm', 'ParallelNextTerm']).default('SequentialNextTerm') }).parse(body);

  const schedule = await db.selectFrom('core.program_schedules')
    .selectAll()
    .where('program_id', '=', programId)
    .orderBy('created_at', 'desc')
    .executeTakeFirst();
  if (!schedule) throw new NotFoundError('Rolling schedule not found');

  const units = await db.selectFrom('core.program_schedule_units')
    .selectAll()
    .where('schedule_id', '=', schedule.id as string)
    .orderBy('order_index', 'asc')
    .execute();

  const idx = units.findIndex(u => u.subject_id === startUnitId);
  if (idx === -1) throw new ValidationError('startUnitId not in schedule');
  const prior = units.slice(0, idx);
  const anchor = new Date(schedule.cycle_anchor_date as unknown as string);
  const cycleLength = units.reduce((sum, u) => sum + u.duration_days, 0);
  const nextTermOffset = cycleLength; // next cycle offset in days

  const catchupUnits = prior.map(u => {
    // compute per next term
    let dayOffset = nextTermOffset;
    for (const v of units) {
      if (v.subject_id === u.subject_id) break;
      dayOffset += 0; // order is preserved; we only place in its natural slot in next term
    }
    const start = new Date(anchor);
    start.setDate(start.getDate() + dayOffset + units.slice(0, u.order_index as number).reduce((s, x) => s + x.duration_days, 0));
    const end = new Date(start);
    end.setDate(end.getDate() + u.duration_days - 1);
    return { subjectId: u.subject_id as string, targetTermIndex: 1, startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
  });

  // For ParallelNextTerm we still schedule in next term same windows; compression not implemented per scope
  return new Response(JSON.stringify({ catchupUnits }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

  // --- Rolling schedule routes ---
  // GET /programs/{programId}/rolling-schedule
  if (m === 'GET' && p.length === 3 && p[0] === 'programs' && p[2] === 'rolling-schedule') {
    return getProgramRollingSchedule(req, ctx, p[1]);
  }
  // GET /course-plans/programs/{programId}/rolling-schedule
  if (m === 'GET' && p.length === 4 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'rolling-schedule') {
    return getProgramRollingSchedule(req, ctx, p[2]);
  }

  // PUT /programs/{programId}/rolling-schedule
  if (m === 'PUT' && p.length === 3 && p[0] === 'programs' && p[2] === 'rolling-schedule') {
    return upsertProgramRollingSchedule(req, ctx, p[1], body);
  }
  // PUT /course-plans/programs/{programId}/rolling-schedule
  if (m === 'PUT' && p.length === 4 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'rolling-schedule') {
    return upsertProgramRollingSchedule(req, ctx, p[2], body);
  }

  // POST /programs/{programId}/rolling-schedule/validate
  if (m === 'POST' && p.length === 4 && p[0] === 'programs' && p[2] === 'rolling-schedule' && p[3] === 'validate') {
    return validateProgramRollingSchedule(req, ctx, p[1], body);
  }
  // POST /course-plans/programs/{programId}/rolling-schedule/validate
  if (m === 'POST' && p.length === 5 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'rolling-schedule' && p[4] === 'validate') {
    return validateProgramRollingSchedule(req, ctx, p[2], body);
  }

  // POST /programs/{programId}/rolling-schedule/preview
  if (m === 'POST' && p.length === 4 && p[0] === 'programs' && p[2] === 'rolling-schedule' && p[3] === 'preview') {
    return previewProgramRollingSchedule(req, ctx, p[1], body);
  }
  // POST /course-plans/programs/{programId}/rolling-schedule/preview
  if (m === 'POST' && p.length === 5 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'rolling-schedule' && p[4] === 'preview') {
    return previewProgramRollingSchedule(req, ctx, p[2], body);
  }

  // POST /programs/{programId}/derive-catchup
  if (m === 'POST' && p.length === 3 && p[0] === 'programs' && p[2] === 'derive-catchup') {
    return deriveCatchupForProgram(req, ctx, p[1], body);
  }
  // POST /course-plans/programs/{programId}/derive-catchup
  if (m === 'POST' && p.length === 4 && p[0] === 'course-plans' && p[1] === 'programs' && p[3] === 'derive-catchup') {
    return deriveCatchupForProgram(req, ctx, p[2], body);
  }

  throw new NotFoundError();
};

serve(createApiRoute(router));


