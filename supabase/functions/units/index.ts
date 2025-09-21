import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError, ValidationError } from '../_shared/errors.ts';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

// Validation schemas
const UnitCreateSchema = z.object({
  subject_identifier: z.string().min(1).max(20),
  subject_name: z.string().min(1).max(200),
  status: z.enum(['Current', 'Superseded', 'Archived']).optional().default('Current'),
  tga_url: z.string().url().optional(),
});

const UnitUpdateSchema = z.object({
  subject_name: z.string().min(1).max(200).optional(),
  status: z.enum(['Current', 'Superseded', 'Archived']).optional(),
  tga_url: z.string().url().optional(),
});

// Helper function to validate UUID format
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// GET /units - List all units with optional filtering
const listUnits = async (req: Request, _ctx: ApiContext): Promise<Response> => {
  const url = new URL(req.url);
  const search = url.searchParams.get('search');
  const status = url.searchParams.get('status');
  const unitType = url.searchParams.get('unit_type');

  let query = db.selectFrom('core.subjects')
    .selectAll()
    .orderBy('subject_name', 'asc');

  // Apply search filter
  if (search) {
    query = query.where((eb) => 
      eb.or([
        eb('subject_identifier', 'ilike', `%${search}%`),
        eb('subject_name', 'ilike', `%${search}%`)
      ])
    );
  }

  // Apply status filter
  if (status && ['Current', 'Superseded', 'Archived'].includes(status)) {
    query = query.where('status', '=', status);
  }

  const units = await query.execute();

  // Apply unit_type filter if specified (requires join with program_subjects)
  let filteredUnits = units;
  if (unitType && ['Core', 'Elective'].includes(unitType)) {
    const programSubjects = await db.selectFrom('core.program_subjects')
      .select(['subject_id'])
      .where('unit_type', '=', unitType)
      .execute();

    const subjectIds = programSubjects.map(ps => ps.subject_id);
    filteredUnits = units.filter(unit => subjectIds.includes(unit.id));
  }

  return new Response(JSON.stringify(filteredUnits), { 
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
};

// POST /units - Create new unit
const createUnit = async (_req: Request, _ctx: ApiContext, body: unknown): Promise<Response> => {
  const payload = UnitCreateSchema.parse(body);

  // Check if unit identifier already exists
  const existing = await db.selectFrom('core.subjects')
    .select(['id'])
    .where('subject_identifier', '=', payload.subject_identifier)
    .executeTakeFirst();

  if (existing) {
    throw new ValidationError('Unit identifier already exists', { subject_identifier: [payload.subject_identifier] });
  }

  const unit = await db.insertInto('core.subjects')
    .values({
      subject_identifier: payload.subject_identifier,
      subject_name: payload.subject_name,
      status: payload.status,
      tga_url: payload.tga_url,
    })
    .returningAll()
    .executeTakeFirst();

  return new Response(JSON.stringify(unit), { 
    status: 201, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
};

// GET /units/{unitId} - Get specific unit
const getUnit = async (_req: Request, _ctx: ApiContext, unitId: string): Promise<Response> => {
  if (!isValidUUID(unitId)) {
    throw new ValidationError('Invalid unit ID format');
  }

  const unit = await db.selectFrom('core.subjects')
    .selectAll()
    .where('id', '=', unitId)
    .executeTakeFirst();

  if (!unit) {
    throw new NotFoundError('Unit not found');
  }

  return new Response(JSON.stringify(unit), { 
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
};

// PUT /units/{unitId} - Update unit
const updateUnit = async (_req: Request, _ctx: ApiContext, unitId: string, body: unknown): Promise<Response> => {
  if (!isValidUUID(unitId)) {
    throw new ValidationError('Invalid unit ID format');
  }

  const payload = UnitUpdateSchema.parse(body);

  // Check if unit exists
  const existing = await db.selectFrom('core.subjects')
    .select(['id'])
    .where('id', '=', unitId)
    .executeTakeFirst();

  if (!existing) {
    throw new NotFoundError('Unit not found');
  }

  const unit = await db.updateTable('core.subjects')
    .set({
      ...payload,
      updated_at: new Date(),
    })
    .where('id', '=', unitId)
    .returningAll()
    .executeTakeFirst();

  return new Response(JSON.stringify(unit), { 
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
};

// DELETE /units/{unitId} - Delete unit
const deleteUnit = async (_req: Request, _ctx: ApiContext, unitId: string): Promise<Response> => {
  if (!isValidUUID(unitId)) {
    throw new ValidationError('Invalid unit ID format');
  }

  // Check if unit exists
  const existing = await db.selectFrom('core.subjects')
    .select(['id'])
    .where('id', '=', unitId)
    .executeTakeFirst();

  if (!existing) {
    throw new NotFoundError('Unit not found');
  }

  await db.deleteFrom('core.subjects')
    .where('id', '=', unitId)
    .execute();

  return new Response(JSON.stringify({ message: 'Unit deleted successfully' }), { 
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
};

// Main router
const unitsRouter = async (req: Request, ctx: ApiContext, body: unknown): Promise<Response> => {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  try {
    // Route: GET /units (list all)
    if (method === 'GET' && pathSegments.length === 1 && pathSegments[0] === 'units') {
      return await listUnits(req, ctx);
    }

    // Route: POST /units (create new)
    if (method === 'POST' && pathSegments.length === 1 && pathSegments[0] === 'units') {
      return await createUnit(req, ctx, body);
    }

    // Route: GET /units/{unitId} (get specific)
    if (method === 'GET' && pathSegments.length === 2 && pathSegments[0] === 'units') {
      return await getUnit(req, ctx, pathSegments[1]);
    }

    // Route: PUT /units/{unitId} (update)
    if (method === 'PUT' && pathSegments.length === 2 && pathSegments[0] === 'units') {
      return await updateUnit(req, ctx, pathSegments[1], body);
    }

    // Route: DELETE /units/{unitId} (delete)
    if (method === 'DELETE' && pathSegments.length === 2 && pathSegments[0] === 'units') {
      return await deleteUnit(req, ctx, pathSegments[1]);
    }

    throw new NotFoundError();
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(JSON.stringify({ message: error.message, details: error.details }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.error('Units API error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(createApiRoute(unitsRouter));
