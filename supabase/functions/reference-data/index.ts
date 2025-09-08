import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { Kysely, PostgresDialect } from "npm:kysely";
import { Pool } from "npm:pg";
import type { DB as Database } from "../_shared/database.types.ts";

const dialect = new PostgresDialect({
  pool: new Pool({ connectionString: Deno.env.get('SUPABASE_DB_URL')! }),
});

const db = new Kysely<Database>({ dialect });

// A strict mapping to prevent arbitrary queries against the database.
const codeTypeMapping: Record<string, string> = {
  COUNTRIES: 'COUNTRY',
  LANGUAGES: 'LANGUAGE',
  DISABILITY_TYPES: 'DisabilityType',
  PRIOR_EDUCATION: 'PriorEducationalAchievement',
  FUNDING_SOURCES: 'FundingSourceNational',
  STUDY_REASONS: 'StudyReason',
};

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
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const codeTypeKey = pathSegments[1]?.toUpperCase();

    if (!codeTypeKey) {
      return new Response(JSON.stringify({ message: 'Invalid reference data type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mappedCodeType = codeTypeMapping[codeTypeKey];
    if (!mappedCodeType) {
      return new Response(JSON.stringify({ message: `Invalid reference data type: '${codeTypeKey}'` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const codes = await db.selectFrom('avetmiss.codes')
      .select(['code_value as code', 'code_description as description'])
      .where('code_type', '=', mappedCodeType)
      .where('is_active', '=', true)
      .orderBy('sort_order')
      .orderBy('code_description')
      .execute();

    return new Response(JSON.stringify(codes), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Reference data error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});