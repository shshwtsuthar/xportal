// supabase/functions/db-test/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';

const dbTestLogic = async (_req: Request, _body: unknown) => {
  const roles = await db.selectFrom('security.roles').select('name').execute();
  return new Response(JSON.stringify(roles), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const handler = createApiRoute(dbTestLogic);
serve(handler);