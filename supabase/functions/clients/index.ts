import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError, ApiError } from '../_shared/errors.ts';
import { sql } from 'npm:kysely';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

// --- Logic: List and Search Clients (with Pagination) ---
const listClientsLogic = async (req: Request, _ctx: ApiContext) => {
  const url = new URL(req.url);
  const search = url.searchParams.get('search');
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  let query = db.selectFrom('core.clients')
    .select(['id', 'client_identifier', 'first_name', 'last_name', 'primary_email']);

  if (search) {
    const searchTerm = `%${search}%`;
    query = query.where((eb) => eb.or([
      eb('first_name', 'ilike', searchTerm),
      eb('last_name', 'ilike', searchTerm),
      eb('primary_email', 'ilike', searchTerm),
      eb('client_identifier', 'ilike', searchTerm),
    ]));
  }

  const clients = await query.limit(limit).offset(offset).orderBy('last_name', 'asc').execute();
  
  return new Response(JSON.stringify(clients), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

export const getClientLogic = async (_req: Request, _ctx: ApiContext, clientId: string) => {
  // Query 1: Fetch the core client record. This is our primary entity.
  const client = await db.selectFrom('core.clients')
    .selectAll()
    .where('id', '=', clientId)
    .executeTakeFirst();

  if (!client) {
    throw new NotFoundError('Client not found.');
  }

  // Query 2: Fetch the related AVETMISS details.
  const avetmissDetails = await db.selectFrom('avetmiss.client_avetmiss_details')
    .selectAll()
    .where('client_id', '=', clientId)
    .executeTakeFirst();

  // Query 3: Fetch all related addresses.
  const addressesResult = await db.selectFrom('core.client_addresses as ca')
    .innerJoin('core.addresses as a', 'ca.address_id', 'a.id')
    .where('ca.client_id', '=', clientId)
    .select(['ca.address_type', 'a.street_name', 'a.suburb', 'a.state_identifier', 'a.postcode'])
    .execute();

  // Assemble the final payload in type-safe TypeScript.
  const clientData = {
    id: client.id,
    clientIdentifier: client.client_identifier,
    createdAt: client.created_at,
    updatedAt: client.updated_at,
    personalDetails: {
      firstName: client.first_name,
      lastName: client.last_name,
      dateOfBirth: client.date_of_birth,
      gender: client.gender,
      primaryEmail: client.primary_email,
    },
    avetmissDetails: {
      countryOfBirthId: client.country_of_birth_identifier,
      languageAtHomeId: avetmissDetails?.language_identifier ?? null,
      indigenousStatusId: avetmissDetails?.indigenous_status_identifier ?? null,
      highestSchoolLevelId: avetmissDetails?.highest_school_level_completed_identifier ?? null,
      labourForceId: avetmissDetails?.labour_force_status_identifier ?? null,
    },
    address: addressesResult.map(addr => ({
      type: addr.address_type,
      details: {
        streetName: addr.street_name,
        suburb: addr.suburb,
        state: addr.state_identifier,
        postcode: addr.postcode,
      }
    }))
  };

  // CRITICAL: The ETag is the raw ISO 8601 string from the database.
  // This is the only way to guarantee a perfect, precision-safe match.
  const etag = client.updated_at instanceof Date 
    ? client.updated_at.toISOString() 
    : client.updated_at;

  return new Response(JSON.stringify(clientData), {
    status: 200,
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'application/json', 
      'ETag': etag
    },
  });
};


// ... (imports and other functions remain the same) ...

// =============================================================================
// FUNCTION: updateClientLogic (v5 - Hardened & Explicit)
// PURPOSE:  Safely updates a client record using optimistic concurrency control.
// PATTERN:  This definitive version abandons dynamic object spreading in the `.set()`
//           clause in favor of explicit, manual object construction. This eliminates
//           any ambiguity for the query builder and adds enhanced logging for
//           unprecedented clarity during execution.
// =============================================================================

const ClientPatchSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  primaryEmail: z.string().email().optional(),
});

export const updateClientLogic = async (req: Request, _ctx: ApiContext, body: unknown, clientId: string) => {
  const ifMatchHeader = req.headers.get('If-Match');
  if (!ifMatchHeader) {
    throw new ApiError('If-Match header is required for updates.', 400);
  }

  const receivedEtag = ifMatchHeader.replace(/^W\//, '').replace(/"/g, '');
  
  console.log(`[DEBUG] Received raw body:`, body);
  const payload = ClientPatchSchema.parse(body);
  console.log(`[DEBUG] Parsed and validated payload:`, payload);

  const updatedClient = await db.transaction().execute(async (trx) => {
    const currentClient = await trx.selectFrom('core.clients')
      .select('updated_at')
      .where('id', '=', clientId)
      .executeTakeFirst();

    if (!currentClient) {
      throw new NotFoundError('Client not found.');
    }

    const currentEtag = currentClient.updated_at instanceof Date 
      ? currentClient.updated_at.toISOString() 
      : currentClient.updated_at;

    if (currentEtag !== receivedEtag) {
      console.error(`[CONFLICT] ETag Mismatch. Received: [${receivedEtag}], Expected: [${currentEtag}]`);
      throw new ApiError('Conflict: The resource has been modified since you last fetched it.', 412);
    }

    // CRITICAL FIX: Manually construct the update object. No more spread operator.
    const updateObject: { first_name?: string; last_name?: string; primary_email?: string; updated_at: Date } = {
      updated_at: new Date(),
    };
    if (payload.firstName) updateObject.first_name = payload.firstName;
    if (payload.lastName) updateObject.last_name = payload.lastName;
    if (payload.primaryEmail) updateObject.primary_email = payload.primaryEmail;

    console.log(`[DEBUG] Executing update with object:`, updateObject);

    return await trx.updateTable('core.clients')
      .set(updateObject) // Use the explicitly constructed object.
      .where('id', '=', clientId)
      .returning(['id', 'client_identifier', 'first_name', 'last_name', 'primary_email', 'updated_at'])
      .executeTakeFirstOrThrow();
  });

  return new Response(JSON.stringify(updatedClient), {
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

// --- The Main Router ---
const clientsRouter = async (req: Request, ctx: ApiContext, body: unknown): Promise<Response> => {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  if (method === 'GET') {
    if (pathSegments.length === 1) return await listClientsLogic(req, ctx);
    if (pathSegments.length === 2) return await getClientLogic(req, ctx, pathSegments[1]);
  }
  if (method === 'PATCH' && pathSegments.length === 2) {
    return await updateClientLogic(req, ctx, body, pathSegments[1]);
  }

  throw new NotFoundError();
};

const handler = createApiRoute(clientsRouter);
serve(handler);