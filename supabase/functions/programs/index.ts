import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { Kysely, PostgresDialect } from "npm:kysely";
import { Pool } from "npm:pg";
import type { DB as Database } from "../_shared/database.types.ts";

const dialect = new PostgresDialect({
  pool: new Pool({ connectionString: Deno.env.get('SUPABASE_DB_URL')! }),
});

const db = new Kysely<Database>({ dialect });

const programsRouter = async (req: Request, _ctx: ApiContext, _body: unknown): Promise<Response> => {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Route: GET /programs (list all)
    if (pathSegments.length === 1 && pathSegments[0] === 'programs') {
      const programs = await db.selectFrom('core.programs')
        .select(['id', 'program_identifier as program_code', 'program_name', 'status'])
        .where('status', '=', 'Current')
        .orderBy('program_name', 'asc')
        .execute();

      return new Response(JSON.stringify(programs), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Route: GET /programs/{id}/subjects (get program subjects)
    if (pathSegments.length === 3 && pathSegments[0] === 'programs' && pathSegments[2] === 'subjects') {
      const programId = pathSegments[1];
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(programId)) {
        return new Response(JSON.stringify({ message: 'Invalid program ID format' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

      return new Response(JSON.stringify(subjects), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Route: GET /programs/{id} (get specific program)
    if (pathSegments.length === 2 && pathSegments[0] === 'programs') {
      const programId = pathSegments[1];
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(programId)) {
        return new Response(JSON.stringify({ message: 'Invalid program ID format' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      const program = await db.selectFrom('core.programs')
        .select(['id', 'program_identifier as program_code', 'program_name', 'status'])
        .where('id', '=', programId)
        .executeTakeFirst();

      if (!program) return new Response(JSON.stringify({ message: 'Program not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      return new Response(JSON.stringify(program), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  // Route not found
  return new Response(JSON.stringify({ message: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

serve(createApiRoute(programsRouter));