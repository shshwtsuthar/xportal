import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError } from '../_shared/errors.ts';

const programsRouter = async (req: Request, _ctx: ApiContext, _body: unknown): Promise<Response> => {
  if (req.method !== 'GET') {
    throw new NotFoundError();
  }

  const programs = await db.selectFrom('core.programs')
    .select(['id', 'program_identifier', 'program_name', 'status'])
    .where('status', '=', 'Current')
    .orderBy('program_name', 'asc')
    .execute();

  return new Response(JSON.stringify(programs), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const handler = createApiRoute(programsRouter);
serve(handler);