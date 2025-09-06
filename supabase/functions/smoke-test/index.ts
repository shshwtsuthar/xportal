// supabase/functions/smoke-test/index.ts (Updated)
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders } from '../_shared/handler.ts';

// deno-lint-ignore require-await
const smokeTestLogic = async (_req: Request, _body: unknown) => {
  const data = { message: "Phase 1 successful. The API handler is working." };
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const handler = createApiRoute(smokeTestLogic);
serve(handler);