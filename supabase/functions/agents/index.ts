import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { Kysely, PostgresDialect } from "npm:kysely";
import { Pool } from "npm:pg";
import type { DB as Database } from "../_shared/database.types.ts";

const dialect = new PostgresDialect({
  pool: new Pool({ connectionString: Deno.env.get('SUPABASE_DB_URL')! }),
});

const db = new Kysely<Database>({ dialect });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const agents = await db.selectFrom('core.agents')
      .select(['id', 'agent_name', 'agent_type', 'primary_contact_name', 'primary_contact_email', 'primary_contact_phone', 'status', 'commission_rate'])
      .where('status', '=', 'Active')
      .orderBy('agent_name', 'asc')
      .execute();

    return new Response(JSON.stringify(agents), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Agents error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});