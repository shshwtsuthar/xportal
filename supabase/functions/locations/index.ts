// =============================================================================
// FILE:        locations/index.ts
// PROJECT:     XPortal Student Management System (SMS)
// DESCRIPTION: Location management endpoints for NAT00020 AVETMISS compliance
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError, BadRequestError } from '../_shared/errors.ts';
// Type definitions for location management
interface CreateLocationRequest {
  organisation_id: string;
  location_identifier: string;
  location_name: string;
  address: {
    building_property_name?: string;
    flat_unit_details?: string;
    street_number?: string;
    street_name: string;
    suburb: string;
    postcode: string;
    state_identifier: string;
    country_identifier?: string;
    sa1_identifier?: string;
    sa2_identifier?: string;
  };
  is_active?: boolean;
}

interface UpdateLocationRequest {
  location_identifier?: string;
  location_name?: string;
  address?: {
    building_property_name?: string;
    flat_unit_details?: string;
    street_number?: string;
    street_name?: string;
    suburb?: string;
    postcode?: string;
    state_identifier?: string;
    country_identifier?: string;
    sa1_identifier?: string;
    sa2_identifier?: string;
  };
  is_active?: boolean;
}

// =============================================================================
// LOCATION MANAGEMENT LOGIC
// =============================================================================

const listLocationsLogic = async (_req: Request, _ctx: ApiContext) => {
  const locations = await db
    .selectFrom('core.locations')
    .leftJoin('core.addresses', 'core.addresses.id', 'core.locations.address_id')
    .leftJoin('core.organisations', 'core.organisations.id', 'core.locations.organisation_id')
    .select([
      'core.locations.id as id',
      'core.locations.organisation_id as organisation_id',
      'core.locations.location_identifier as location_identifier',
      'core.locations.location_name as location_name',
      'core.locations.is_active as is_active',
      'core.locations.created_at as created_at',
      'core.locations.updated_at as updated_at',
      'core.addresses.id as address_id',
      'core.addresses.building_property_name as building_property_name',
      'core.addresses.flat_unit_details as flat_unit_details',
      'core.addresses.street_number as street_number',
      'core.addresses.street_name as street_name',
      'core.addresses.suburb as suburb',
      'core.addresses.postcode as postcode',
      'core.addresses.state_identifier as address_state_identifier',
      'core.addresses.country_identifier as country_identifier',
      'core.addresses.sa1_identifier as sa1_identifier',
      'core.addresses.sa2_identifier as sa2_identifier',
      'core.addresses.created_at as address_created_at',
      'core.addresses.updated_at as address_updated_at',
      'core.organisations.organisation_name as organisation_name',
      'core.organisations.organisation_identifier as organisation_identifier',
    ])
    .orderBy('core.locations.location_name', 'asc')
    .execute();

  // Transform the data to match the API schema
  const transformedLocations = locations.map(location => ({
    id: location.id,
    organisation_id: location.organisation_id,
    organisation_identifier: location.organisation_identifier,
    location_identifier: location.location_identifier,
    location_name: location.location_name,
    is_active: location.is_active,
    address_id: location.address_id,
    address: location.address_id ? {
      id: location.address_id,
      building_property_name: location.building_property_name,
      flat_unit_details: location.flat_unit_details,
      street_number: location.street_number,
      street_name: location.street_name,
      suburb: location.suburb,
      postcode: location.postcode,
      state_identifier: location.address_state_identifier,
      country_identifier: location.country_identifier,
      sa1_identifier: location.sa1_identifier,
      sa2_identifier: location.sa2_identifier,
      created_at: location.address_created_at,
      updated_at: location.address_updated_at,
    } : null,
    created_at: location.created_at,
    updated_at: location.updated_at,
  }));

  return new Response(JSON.stringify({ locations: transformedLocations }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const createLocationLogic = async (_req: Request, _ctx: ApiContext, body: unknown) => {
  const data = body as CreateLocationRequest;
  
  // Validate required fields
  if (!data.organisation_id || !data.location_identifier || 
      !data.location_name || !data.address) {
    throw new BadRequestError('Missing required fields: organisation_id, location_identifier, location_name, address');
  }

  // Verify organisation exists
  const organisation = await db
    .selectFrom('core.organisations')
    .select(['id'])
    .where('id', '=', data.organisation_id)
    .executeTakeFirst();

  if (!organisation) {
    throw new BadRequestError('Organisation not found');
  }

  // Start transaction
  const result = await db.transaction().execute(async (trx) => {
    // Create address
    const addressResult = await trx
      .insertInto('core.addresses')
      .values({
        building_property_name: data.address.building_property_name || null,
        flat_unit_details: data.address.flat_unit_details || null,
        street_number: data.address.street_number || null,
        street_name: data.address.street_name || null,
        suburb: data.address.suburb,
        postcode: data.address.postcode,
        state_identifier: data.address.state_identifier,
        country_identifier: data.address.country_identifier || '1101',
        sa1_identifier: data.address.sa1_identifier || null,
        sa2_identifier: data.address.sa2_identifier || null,
      })
      .returning('id')
      .executeTakeFirst();

    if (!addressResult?.id) {
      throw new Error('Failed to create address');
    }

    // Create location
    const locationResult = await trx
      .insertInto('core.locations')
      .values({
        organisation_id: data.organisation_id,
        location_identifier: data.location_identifier,
        location_name: data.location_name,
        address_id: addressResult.id,
        is_active: data.is_active !== undefined ? data.is_active : true,
      })
      .returningAll()
      .executeTakeFirst();

    return { location: locationResult, addressId: addressResult.id };
  });

  // Fetch the complete location with address
  const completeLocation = await db
    .selectFrom('core.locations')
    .leftJoin('core.addresses', 'core.addresses.id', 'core.locations.address_id')
    .leftJoin('core.organisations', 'core.organisations.id', 'core.locations.organisation_id')
    .select([
      'core.locations.id as id',
      'core.locations.organisation_id as organisation_id',
      'core.locations.location_identifier as location_identifier',
      'core.locations.location_name as location_name',
      'core.locations.is_active as is_active',
      'core.locations.created_at as created_at',
      'core.locations.updated_at as updated_at',
      'core.addresses.id as address_id',
      'core.addresses.building_property_name as building_property_name',
      'core.addresses.flat_unit_details as flat_unit_details',
      'core.addresses.street_number as street_number',
      'core.addresses.street_name as street_name',
      'core.addresses.suburb as suburb',
      'core.addresses.postcode as postcode',
      'core.addresses.state_identifier as address_state_identifier',
      'core.addresses.country_identifier as country_identifier',
      'core.addresses.sa1_identifier as sa1_identifier',
      'core.addresses.sa2_identifier as sa2_identifier',
      'core.addresses.created_at as address_created_at',
      'core.addresses.updated_at as address_updated_at',
      'core.organisations.organisation_identifier as organisation_identifier',
    ])
    .where('core.locations.id', '=', result.location?.id!)
    .executeTakeFirst();

  if (!completeLocation) {
    throw new Error('Failed to fetch created location');
  }

  const transformedLocation = {
    id: completeLocation.id,
    organisation_id: completeLocation.organisation_id,
    organisation_identifier: completeLocation.organisation_identifier,
    location_identifier: completeLocation.location_identifier,
    location_name: completeLocation.location_name,
    is_active: completeLocation.is_active,
    address_id: completeLocation.address_id,
    address: completeLocation.address_id ? {
      id: completeLocation.address_id,
      building_property_name: completeLocation.building_property_name,
      flat_unit_details: completeLocation.flat_unit_details,
      street_number: completeLocation.street_number,
      street_name: completeLocation.street_name,
      suburb: completeLocation.suburb,
      postcode: completeLocation.postcode,
      state_identifier: completeLocation.address_state_identifier,
      country_identifier: completeLocation.country_identifier,
      sa1_identifier: completeLocation.sa1_identifier,
      sa2_identifier: completeLocation.sa2_identifier,
      created_at: completeLocation.address_created_at,
      updated_at: completeLocation.address_updated_at,
    } : null,
    created_at: completeLocation.created_at,
    updated_at: completeLocation.updated_at,
  };

  return new Response(JSON.stringify(transformedLocation), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const getLocationByIdLogic = async (_req: Request, _ctx: ApiContext, id: string) => {
  const location = await db
    .selectFrom('core.locations')
    .leftJoin('core.addresses', 'core.addresses.id', 'core.locations.address_id')
    .select([
      'core.locations.id as id',
      'core.locations.organisation_id as organisation_id',
      'core.locations.location_identifier as location_identifier',
      'core.locations.location_name as location_name',
      'core.locations.is_active as is_active',
      'core.locations.created_at as created_at',
      'core.locations.updated_at as updated_at',
      'core.addresses.id as address_id',
      'core.addresses.building_property_name as building_property_name',
      'core.addresses.flat_unit_details as flat_unit_details',
      'core.addresses.street_number as street_number',
      'core.addresses.street_name as street_name',
      'core.addresses.suburb as suburb',
      'core.addresses.postcode as postcode',
      'core.addresses.state_identifier as address_state_identifier',
      'core.addresses.country_identifier as country_identifier',
      'core.addresses.sa1_identifier as sa1_identifier',
      'core.addresses.sa2_identifier as sa2_identifier',
      'core.addresses.created_at as address_created_at',
      'core.addresses.updated_at as address_updated_at',
    ])
    .where('core.locations.id', '=', id)
    .executeTakeFirst();

  if (!location) {
    throw new NotFoundError('Location not found');
  }

  const transformedLocation = {
    id: location.id,
    organisation_id: location.organisation_id,
    location_identifier: location.location_identifier,
    location_name: location.location_name,
    is_active: location.is_active,
    address_id: location.address_id,
    address: location.address_id ? {
      id: location.address_id,
      building_property_name: location.building_property_name,
      flat_unit_details: location.flat_unit_details,
      street_number: location.street_number,
      street_name: location.street_name,
      suburb: location.suburb,
      postcode: location.postcode,
      state_identifier: location.address_state_identifier,
      country_identifier: location.country_identifier,
      sa1_identifier: location.sa1_identifier,
      sa2_identifier: location.sa2_identifier,
      created_at: location.address_created_at,
      updated_at: location.address_updated_at,
    } : null,
    created_at: location.created_at,
    updated_at: location.updated_at,
  };

  return new Response(JSON.stringify(transformedLocation), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const updateLocationLogic = async (_req: Request, _ctx: ApiContext, id: string, body: unknown) => {
  const data = body as UpdateLocationRequest;

  // Start transaction
  const _result = await db.transaction().execute(async (trx) => {
    // Get existing location
    const existingLocation = await trx
      .selectFrom('core.locations')
      .select(['address_id'])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existingLocation) {
      throw new NotFoundError('Location not found');
    }

    const addressId = existingLocation.address_id;
    
    // Update address if provided
    if (data.address && addressId) {
      await trx
        .updateTable('core.addresses')
        .set({
          building_property_name: data.address.building_property_name || null,
          flat_unit_details: data.address.flat_unit_details || null,
          street_number: data.address.street_number || null,
          street_name: data.address.street_name || null,
          suburb: data.address.suburb,
          postcode: data.address.postcode,
          state_identifier: data.address.state_identifier,
          country_identifier: data.address.country_identifier || '1101',
          sa1_identifier: data.address.sa1_identifier || null,
          sa2_identifier: data.address.sa2_identifier || null,
          updated_at: new Date(),
        })
        .where('id', '=', addressId)
        .execute();
    }

    // Update location
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (data.location_identifier !== undefined) updateData.location_identifier = data.location_identifier;
    if (data.location_name !== undefined) updateData.location_name = data.location_name;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const locationResult = await trx
      .updateTable('core.locations')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return { location: locationResult, addressId };
  });

  // Fetch the complete updated location with address
  const completeLocation = await db
    .selectFrom('core.locations')
    .leftJoin('core.addresses', 'core.addresses.id', 'core.locations.address_id')
    .select([
      'core.locations.id as id',
      'core.locations.organisation_id as organisation_id',
      'core.locations.location_identifier as location_identifier',
      'core.locations.location_name as location_name',
      'core.locations.is_active as is_active',
      'core.locations.created_at as created_at',
      'core.locations.updated_at as updated_at',
      'core.addresses.id as address_id',
      'core.addresses.building_property_name as building_property_name',
      'core.addresses.flat_unit_details as flat_unit_details',
      'core.addresses.street_number as street_number',
      'core.addresses.street_name as street_name',
      'core.addresses.suburb as suburb',
      'core.addresses.postcode as postcode',
      'core.addresses.state_identifier as address_state_identifier',
      'core.addresses.country_identifier as country_identifier',
      'core.addresses.sa1_identifier as sa1_identifier',
      'core.addresses.sa2_identifier as sa2_identifier',
      'core.addresses.created_at as address_created_at',
      'core.addresses.updated_at as address_updated_at',
    ])
    .where('core.locations.id', '=', id)
    .executeTakeFirst();

  if (!completeLocation) {
    throw new NotFoundError('Location not found after update');
  }

  const transformedLocation = {
    id: completeLocation.id,
    organisation_id: completeLocation.organisation_id,
    organisation_identifier: completeLocation.organisation_identifier,
    location_identifier: completeLocation.location_identifier,
    location_name: completeLocation.location_name,
    is_active: completeLocation.is_active,
    address_id: completeLocation.address_id,
    address: completeLocation.address_id ? {
      id: completeLocation.address_id,
      building_property_name: completeLocation.building_property_name,
      flat_unit_details: completeLocation.flat_unit_details,
      street_number: completeLocation.street_number,
      street_name: completeLocation.street_name,
      suburb: completeLocation.suburb,
      postcode: completeLocation.postcode,
      state_identifier: completeLocation.address_state_identifier,
      country_identifier: completeLocation.country_identifier,
      sa1_identifier: completeLocation.sa1_identifier,
      sa2_identifier: completeLocation.sa2_identifier,
      created_at: completeLocation.address_created_at,
      updated_at: completeLocation.address_updated_at,
    } : null,
    created_at: completeLocation.created_at,
    updated_at: completeLocation.updated_at,
  };

  return new Response(JSON.stringify(transformedLocation), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const deleteLocationLogic = async (_req: Request, _ctx: ApiContext, id: string) => {
  // Check if location exists
  const existingLocation = await db
    .selectFrom('core.locations')
    .select(['id', 'address_id'])
    .where('id', '=', id)
    .executeTakeFirst();

  if (!existingLocation) {
    throw new NotFoundError('Location not found');
  }

  // Start transaction to delete location and address
  await db.transaction().execute(async (trx) => {
    // Delete location first (foreign key constraint)
    await trx
      .deleteFrom('core.locations')
      .where('id', '=', id)
      .execute();

    // Delete associated address if it exists
    if (existingLocation.address_id) {
      await trx
        .deleteFrom('core.addresses')
        .where('id', '=', existingLocation.address_id)
        .execute();
    }
  });

  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders },
  });
};

const toggleLocationStatusLogic = async (_req: Request, _ctx: ApiContext, id: string) => {
  // Get current location
  const existingLocation = await db
    .selectFrom('core.locations')
    .select(['id', 'is_active'])
    .where('id', '=', id)
    .executeTakeFirst();

  if (!existingLocation) {
    throw new NotFoundError('Location not found');
  }

  // Toggle status
  const newStatus = !existingLocation.is_active;
  
  await db
    .updateTable('core.locations')
    .set({
      is_active: newStatus,
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .execute();

  // Fetch the complete updated location with address
  const completeLocation = await db
    .selectFrom('core.locations')
    .leftJoin('core.addresses', 'core.addresses.id', 'core.locations.address_id')
    .select([
      'core.locations.id as id',
      'core.locations.organisation_id as organisation_id',
      'core.locations.location_identifier as location_identifier',
      'core.locations.location_name as location_name',
      'core.locations.is_active as is_active',
      'core.locations.created_at as created_at',
      'core.locations.updated_at as updated_at',
      'core.addresses.id as address_id',
      'core.addresses.building_property_name as building_property_name',
      'core.addresses.flat_unit_details as flat_unit_details',
      'core.addresses.street_number as street_number',
      'core.addresses.street_name as street_name',
      'core.addresses.suburb as suburb',
      'core.addresses.postcode as postcode',
      'core.addresses.state_identifier as address_state_identifier',
      'core.addresses.country_identifier as country_identifier',
      'core.addresses.sa1_identifier as sa1_identifier',
      'core.addresses.sa2_identifier as sa2_identifier',
      'core.addresses.created_at as address_created_at',
      'core.addresses.updated_at as address_updated_at',
    ])
    .where('core.locations.id', '=', id)
    .executeTakeFirst();

  if (!completeLocation) {
    throw new NotFoundError('Location not found after toggle');
  }

  const transformedLocation = {
    id: completeLocation.id,
    organisation_id: completeLocation.organisation_id,
    organisation_identifier: completeLocation.organisation_identifier,
    location_identifier: completeLocation.location_identifier,
    location_name: completeLocation.location_name,
    is_active: completeLocation.is_active,
    address_id: completeLocation.address_id,
    address: completeLocation.address_id ? {
      id: completeLocation.address_id,
      building_property_name: completeLocation.building_property_name,
      flat_unit_details: completeLocation.flat_unit_details,
      street_number: completeLocation.street_number,
      street_name: completeLocation.street_name,
      suburb: completeLocation.suburb,
      postcode: completeLocation.postcode,
      state_identifier: completeLocation.address_state_identifier,
      country_identifier: completeLocation.country_identifier,
      sa1_identifier: completeLocation.sa1_identifier,
      sa2_identifier: completeLocation.sa2_identifier,
      created_at: completeLocation.address_created_at,
      updated_at: completeLocation.address_updated_at,
    } : null,
    created_at: completeLocation.created_at,
    updated_at: completeLocation.updated_at,
  };

  return new Response(JSON.stringify(transformedLocation), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

// =============================================================================
// ROUTER
// =============================================================================

const router = async (req: Request, ctx: ApiContext, body: unknown): Promise<Response> => {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  // GET /locations
  if (method === 'GET' && parts.length === 1 && parts[0] === 'locations') {
    return await listLocationsLogic(req, ctx);
  }

  // POST /locations
  if (method === 'POST' && parts.length === 1 && parts[0] === 'locations') {
    return await createLocationLogic(req, ctx, body);
  }

  // GET /locations/{id}
  if (method === 'GET' && parts.length === 2 && parts[0] === 'locations') {
    return await getLocationByIdLogic(req, ctx, parts[1]);
  }

  // PUT /locations/{id}
  if (method === 'PUT' && parts.length === 2 && parts[0] === 'locations') {
    return await updateLocationLogic(req, ctx, parts[1], body);
  }

  // DELETE /locations/{id}
  if (method === 'DELETE' && parts.length === 2 && parts[0] === 'locations') {
    return await deleteLocationLogic(req, ctx, parts[1]);
  }

  // PATCH /locations/{id}/toggle-status
  if (method === 'PATCH' && parts.length === 3 && parts[0] === 'locations' && parts[2] === 'toggle-status') {
    return await toggleLocationStatusLogic(req, ctx, parts[1]);
  }

  throw new NotFoundError();
};

const handler = createApiRoute(router);
serve(handler);