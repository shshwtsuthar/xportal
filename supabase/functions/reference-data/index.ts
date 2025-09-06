import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError } from '../_shared/errors.ts';

// A strict mapping to prevent arbitrary queries against the database.
// This is a security and validation best practice.
const codeTypeMapping: Record<string, string> = {
  COUNTRY: 'COUNTRY',
  LANGUAGE: 'LANGUAGE',
  DISABILITY_TYPE: 'DisabilityType',
  PRIOR_EDUCATION: 'PriorEducationalAchievement',
  FUNDING_SOURCE: 'FundingSourceNational',
  STUDY_REASON: 'StudyReason',
};

const referenceDataRouter = async (req: Request, _ctx: ApiContext, _body: unknown): Promise<Response> => {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const codeTypeKey = pathSegments[1]?.toUpperCase();

  if (req.method !== 'GET' || !codeTypeKey) {
    throw new NotFoundError();
  }

  const mappedCodeType = codeTypeMapping[codeTypeKey];
  if (!mappedCodeType) {
    throw new NotFoundError(`Invalid reference data type: '${codeTypeKey}'`);
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const handler = createApiRoute(referenceDataRouter);
serve(handler);