import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError, ValidationError } from '../_shared/errors.ts';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

// Validation schemas - full NAT00030 compliance
const ProgramCreateSchema = z.object({
  program_identifier: z.string().min(1).max(10),
  program_name: z.string().min(1).max(200),
  status: z.enum(['Current', 'Superseded', 'Archived']).optional().default('Current'),
  tga_url: z.string().url().optional(),
  // NAT00030 fields
  program_level_of_education_identifier: z.string().min(3).max(3).optional(),
  program_field_of_education_identifier: z.string().min(4).max(4).optional(),
  program_recognition_identifier: z.string().min(2).max(2).optional(),
  vet_flag: z.enum(['Y', 'N']).optional(),
  nominal_hours: z.number().int().min(0).optional(),
  anzsco_identifier: z.string().min(6).max(6).optional(),
  anzsic_identifier: z.string().min(4).max(4).optional(),
});

const ProgramUpdateSchema = z.object({
  program_name: z.string().min(1).max(100).optional(),
  status: z.enum(['Current', 'Superseded', 'Archived']).optional(),
  tga_url: z.string().url().optional(),
  // NAT00030 fields
  program_level_of_education_identifier: z.string().min(3).max(3).optional(),
  program_field_of_education_identifier: z.string().min(4).max(4).optional(),
  program_recognition_identifier: z.string().min(2).max(2).optional(),
  vet_flag: z.enum(['Y', 'N']).optional(),
  nominal_hours: z.number().int().min(0).optional(),
  anzsco_identifier: z.string().min(6).max(6).optional(),
  anzsic_identifier: z.string().min(4).max(4).optional(),
});

// Helper function to validate UUID format
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// GET /programs - List all programs
const listPrograms = async (_req: Request, _ctx: ApiContext): Promise<Response> => {
      const programs = await db.selectFrom('core.programs')
    .selectAll()
        .orderBy('program_name', 'asc')
        .execute();

  return new Response(JSON.stringify(programs), { 
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
};

// POST /programs - Create new program
const createProgram = async (_req: Request, _ctx: ApiContext, body: unknown): Promise<Response> => {
  const payload = ProgramCreateSchema.parse(body);

  // Check if program identifier already exists
  const existing = await db.selectFrom('core.programs')
    .select(['id'])
    .where('program_identifier', '=', payload.program_identifier)
    .executeTakeFirst();

  if (existing) {
    throw new ValidationError('Program identifier already exists', { program_identifier: [payload.program_identifier] });
  }

  const program = await db.insertInto('core.programs')
    .values({
      program_identifier: payload.program_identifier,
      program_name: payload.program_name,
      status: payload.status,
      tga_url: payload.tga_url,
      // NAT00030 fields - handle defaults for NOT NULL fields
      program_level_of_education_identifier: payload.program_level_of_education_identifier || '000',
      program_field_of_education_identifier: payload.program_field_of_education_identifier || '0000',
      program_recognition_identifier: payload.program_recognition_identifier || '01',
      vet_flag: payload.vet_flag || 'Y',
      nominal_hours: payload.nominal_hours || 0,
      anzsco_identifier: payload.anzsco_identifier || null,
      anzsic_identifier: payload.anzsic_identifier || null,
    })
    .returningAll()
    .executeTakeFirst();

  return new Response(JSON.stringify(program), { 
    status: 201, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
};

// GET /programs/{programId} - Get specific program
const getProgram = async (_req: Request, _ctx: ApiContext, programId: string): Promise<Response> => {
  if (!isValidUUID(programId)) {
    throw new ValidationError('Invalid program ID format');
  }

  const program = await db.selectFrom('core.programs')
    .selectAll()
    .where('id', '=', programId)
    .executeTakeFirst();

  if (!program) {
    throw new NotFoundError('Program not found');
  }

  return new Response(JSON.stringify(program), { 
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
};

// PUT /programs/{programId} - Update program
const updateProgram = async (_req: Request, _ctx: ApiContext, programId: string, body: unknown): Promise<Response> => {
  if (!isValidUUID(programId)) {
    throw new ValidationError('Invalid program ID format');
  }

  const payload = ProgramUpdateSchema.parse(body);

  // Check if program exists
  const existing = await db.selectFrom('core.programs')
    .select(['id'])
    .where('id', '=', programId)
    .executeTakeFirst();

  if (!existing) {
    throw new NotFoundError('Program not found');
  }

  const program = await db.updateTable('core.programs')
    .set({
      ...payload,
      updated_at: new Date(),
    })
    .where('id', '=', programId)
    .returningAll()
    .executeTakeFirst();

  return new Response(JSON.stringify(program), { 
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
};

// DELETE /programs/{programId} - Delete program
const deleteProgram = async (_req: Request, _ctx: ApiContext, programId: string): Promise<Response> => {
  if (!isValidUUID(programId)) {
    throw new ValidationError('Invalid program ID format');
  }

  // Check if program exists
  const existing = await db.selectFrom('core.programs')
    .select(['id'])
    .where('id', '=', programId)
    .executeTakeFirst();

  if (!existing) {
    throw new NotFoundError('Program not found');
  }

  await db.deleteFrom('core.programs')
    .where('id', '=', programId)
    .execute();

  return new Response(JSON.stringify({ message: 'Program deleted successfully' }), { 
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
};

// GET /programs/{programId}/subjects - Get program subjects
const getProgramSubjects = async (_req: Request, _ctx: ApiContext, programId: string): Promise<Response> => {
  if (!isValidUUID(programId)) {
    throw new ValidationError('Invalid program ID format');
      }
      
      const subjects = await db.selectFrom('core.program_subjects as ps')
        .innerJoin('core.subjects as s', 'ps.subject_id', 's.id')
        .where('ps.program_id', '=', programId)
        .select([
          's.id as subject_id',
          's.subject_identifier',
          's.subject_name',
          'ps.unit_type'
        ])
        .orderBy('ps.unit_type', 'asc')
        .orderBy('s.subject_name', 'asc')
        .execute();

  return new Response(JSON.stringify(subjects), { 
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
};

// Main router
const programsRouter = async (req: Request, ctx: ApiContext, body: unknown): Promise<Response> => {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  try {
    // Route: GET /programs (list all)
    if (method === 'GET' && pathSegments.length === 1 && pathSegments[0] === 'programs') {
      return await listPrograms(req, ctx);
    }

    // Route: POST /programs (create new)
    if (method === 'POST' && pathSegments.length === 1 && pathSegments[0] === 'programs') {
      return await createProgram(req, ctx, body);
    }

    // Route: GET /programs/{programId} (get specific)
    if (method === 'GET' && pathSegments.length === 2 && pathSegments[0] === 'programs') {
      return await getProgram(req, ctx, pathSegments[1]);
    }

    // Route: PUT /programs/{programId} (update)
    if (method === 'PUT' && pathSegments.length === 2 && pathSegments[0] === 'programs') {
      return await updateProgram(req, ctx, pathSegments[1], body);
    }

    // Route: DELETE /programs/{programId} (delete)
    if (method === 'DELETE' && pathSegments.length === 2 && pathSegments[0] === 'programs') {
      return await deleteProgram(req, ctx, pathSegments[1]);
    }

    // Route: GET /programs/{programId}/subjects (get program subjects)
    if (method === 'GET' && pathSegments.length === 3 && pathSegments[0] === 'programs' && pathSegments[2] === 'subjects') {
      return await getProgramSubjects(req, ctx, pathSegments[1]);
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

    console.error('Programs API error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(createApiRoute(programsRouter));