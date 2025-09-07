// =============================================================================
// FILE:        locations/index.ts
// PROJECT:     XPortal Student Management System (SMS)
// DESCRIPTION: Read-only endpoints to fetch delivery locations
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError } from '../_shared/errors.ts';

const listLocationsLogic = async (_req: Request, _ctx: ApiContext) => {
  const rows = await db
    .selectFrom('core.locations')
    .select([
      'id as id',
      'location_identifier as identifier',
      'location_name as name',
    ])
    .orderBy('location_name', 'asc')
    .execute();

  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const getLocationByIdLogic = async (_req: Request, _ctx: ApiContext, id: string) => {
  const row = await db
    .selectFrom('core.locations')
    .select([
      'id as id',
      'location_identifier as identifier',
      'location_name as name',
    ])
    .where('id', '=', id)
    .executeTakeFirst();

  if (!row) throw new NotFoundError('Location not found');

  return new Response(JSON.stringify(row), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const router = async (req: Request, ctx: ApiContext): Promise<Response> => {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  // GET /locations
  if (method === 'GET' && parts.length === 1 && parts[0] === 'locations') {
    return await listLocationsLogic(req, ctx);
  }

  // GET /locations/{id}
  if (method === 'GET' && parts.length === 2 && parts[0] === 'locations') {
    return await getLocationByIdLogic(req, ctx, parts[1]);
  }

  throw new NotFoundError();
};

const handler = createApiRoute(router);
serve(handler);


