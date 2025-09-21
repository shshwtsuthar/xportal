// =============================================================================
// FILE:        organisations/index.ts
// PROJECT:     XPortal Student Management System (SMS)
// DESCRIPTION: Organisation management endpoints for NAT00010 AVETMISS compliance
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError, BadRequestError } from '../_shared/errors.ts';
// Type definitions for organisation management
interface CreateOrganisationRequest {
  organisation_identifier: string;
  organisation_name: string;
  organisation_type_identifier: string;
  state_identifier: string;
  address?: {
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
  phone_number?: string;
  fax_number?: string;
  email_address?: string;
  contact_name?: string;
}

interface UpdateOrganisationRequest {
  organisation_identifier?: string;
  organisation_name?: string;
  organisation_type_identifier?: string;
  state_identifier?: string;
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
  phone_number?: string;
  fax_number?: string;
  email_address?: string;
  contact_name?: string;
}

// =============================================================================
// ORGANISATION MANAGEMENT LOGIC
// =============================================================================

const listOrganisationsLogic = async (_req: Request, _ctx: ApiContext) => {
  const organisations = await db
    .selectFrom('core.organisations')
    .leftJoin('core.addresses', 'core.addresses.id', 'core.organisations.address_id')
    .select([
      'core.organisations.id as id',
      'core.organisations.organisation_identifier as organisation_identifier',
      'core.organisations.organisation_name as organisation_name',
      'core.organisations.organisation_type_identifier as organisation_type_identifier',
      'core.organisations.state_identifier as state_identifier',
      'core.organisations.phone_number as phone_number',
      'core.organisations.fax_number as fax_number',
      'core.organisations.email_address as email_address',
      'core.organisations.contact_name as contact_name',
      'core.organisations.created_at as created_at',
      'core.organisations.updated_at as updated_at',
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
    .orderBy('core.organisations.organisation_name', 'asc')
    .execute();

  // Transform the data to match the API schema
  const transformedOrganisations = organisations.map(org => ({
    id: org.id,
    organisation_identifier: org.organisation_identifier,
    organisation_name: org.organisation_name,
    organisation_type_identifier: org.organisation_type_identifier,
    state_identifier: org.state_identifier,
    phone_number: org.phone_number,
    fax_number: org.fax_number,
    email_address: org.email_address,
    contact_name: org.contact_name,
    address_id: org.address_id,
    address: org.address_id ? {
      id: org.address_id,
      building_property_name: org.building_property_name,
      flat_unit_details: org.flat_unit_details,
      street_number: org.street_number,
      street_name: org.street_name,
      suburb: org.suburb,
      postcode: org.postcode,
      state_identifier: org.address_state_identifier,
      country_identifier: org.country_identifier,
      sa1_identifier: org.sa1_identifier,
      sa2_identifier: org.sa2_identifier,
      created_at: org.address_created_at,
      updated_at: org.address_updated_at,
    } : null,
    created_at: org.created_at,
    updated_at: org.updated_at,
  }));

  return new Response(JSON.stringify({ organisations: transformedOrganisations }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const createOrganisationLogic = async (_req: Request, _ctx: ApiContext, body: unknown) => {
  const data = body as CreateOrganisationRequest;
  
  // Validate required fields
  if (!data.organisation_identifier || !data.organisation_name || 
      !data.organisation_type_identifier || !data.state_identifier) {
    throw new BadRequestError('Missing required fields: organisation_identifier, organisation_name, organisation_type_identifier, state_identifier');
  }

  // Check if an organisation already exists
  const existingOrg = await db
    .selectFrom('core.organisations')
    .select(['id'])
    .executeTakeFirst();

  // If organisation exists, update it instead of creating a new one
  if (existingOrg) {
    return await updateOrganisationLogic(_req, _ctx, existingOrg.id, body);
  }

  // Start transaction
  const result = await db.transaction().execute(async (trx) => {
    let addressId = null;
    
    // Create address if provided
    if (data.address) {
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
      
      addressId = addressResult?.id || null;
    }

    // Create organisation
    const organisationResult = await trx
      .insertInto('core.organisations')
      .values({
        organisation_identifier: data.organisation_identifier,
        organisation_name: data.organisation_name,
        organisation_type_identifier: data.organisation_type_identifier,
        state_identifier: data.state_identifier,
        address_id: addressId,
        phone_number: data.phone_number || null,
        fax_number: data.fax_number || null,
        email_address: data.email_address || null,
        contact_name: data.contact_name || null,
      })
      .returningAll()
      .executeTakeFirst();

    return { organisation: organisationResult, addressId };
  });

  // Fetch the complete organisation with address
  const completeOrganisation = await db
    .selectFrom('core.organisations')
    .leftJoin('core.addresses', 'core.addresses.id', 'core.organisations.address_id')
    .select([
      'core.organisations.id as id',
      'core.organisations.organisation_identifier as organisation_identifier',
      'core.organisations.organisation_name as organisation_name',
      'core.organisations.organisation_type_identifier as organisation_type_identifier',
      'core.organisations.state_identifier as state_identifier',
      'core.organisations.phone_number as phone_number',
      'core.organisations.fax_number as fax_number',
      'core.organisations.email_address as email_address',
      'core.organisations.contact_name as contact_name',
      'core.organisations.created_at as created_at',
      'core.organisations.updated_at as updated_at',
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
    .where('core.organisations.id', '=', result.organisation?.id!)
    .executeTakeFirst();

  if (!completeOrganisation) {
    throw new Error('Failed to fetch created organisation');
  }

  const transformedOrganisation = {
    id: completeOrganisation.id,
    organisation_identifier: completeOrganisation.organisation_identifier,
    organisation_name: completeOrganisation.organisation_name,
    organisation_type_identifier: completeOrganisation.organisation_type_identifier,
    state_identifier: completeOrganisation.state_identifier,
    phone_number: completeOrganisation.phone_number,
    fax_number: completeOrganisation.fax_number,
    email_address: completeOrganisation.email_address,
    contact_name: completeOrganisation.contact_name,
    address_id: completeOrganisation.address_id,
    address: completeOrganisation.address_id ? {
      id: completeOrganisation.address_id,
      building_property_name: completeOrganisation.building_property_name,
      flat_unit_details: completeOrganisation.flat_unit_details,
      street_number: completeOrganisation.street_number,
      street_name: completeOrganisation.street_name,
      suburb: completeOrganisation.suburb,
      postcode: completeOrganisation.postcode,
      state_identifier: completeOrganisation.address_state_identifier,
      country_identifier: completeOrganisation.country_identifier,
      sa1_identifier: completeOrganisation.sa1_identifier,
      sa2_identifier: completeOrganisation.sa2_identifier,
      created_at: completeOrganisation.address_created_at,
      updated_at: completeOrganisation.address_updated_at,
    } : null,
    created_at: completeOrganisation.created_at,
    updated_at: completeOrganisation.updated_at,
  };

  return new Response(JSON.stringify(transformedOrganisation), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const getOrganisationByIdLogic = async (_req: Request, _ctx: ApiContext, id: string) => {
  const organisation = await db
    .selectFrom('core.organisations')
    .leftJoin('core.addresses', 'core.addresses.id', 'core.organisations.address_id')
    .select([
      'core.organisations.id as id',
      'core.organisations.organisation_identifier as organisation_identifier',
      'core.organisations.organisation_name as organisation_name',
      'core.organisations.organisation_type_identifier as organisation_type_identifier',
      'core.organisations.state_identifier as state_identifier',
      'core.organisations.phone_number as phone_number',
      'core.organisations.fax_number as fax_number',
      'core.organisations.email_address as email_address',
      'core.organisations.contact_name as contact_name',
      'core.organisations.created_at as created_at',
      'core.organisations.updated_at as updated_at',
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
    .where('core.organisations.id', '=', id)
    .executeTakeFirst();

  if (!organisation) {
    throw new NotFoundError('Organisation not found');
  }

  const transformedOrganisation = {
    id: organisation.id,
    organisation_identifier: organisation.organisation_identifier,
    organisation_name: organisation.organisation_name,
    organisation_type_identifier: organisation.organisation_type_identifier,
    state_identifier: organisation.state_identifier,
    phone_number: organisation.phone_number,
    fax_number: organisation.fax_number,
    email_address: organisation.email_address,
    contact_name: organisation.contact_name,
    address_id: organisation.address_id,
    address: organisation.address_id ? {
      id: organisation.address_id,
      building_property_name: organisation.building_property_name,
      flat_unit_details: organisation.flat_unit_details,
      street_number: organisation.street_number,
      street_name: organisation.street_name,
      suburb: organisation.suburb,
      postcode: organisation.postcode,
      state_identifier: organisation.address_state_identifier,
      country_identifier: organisation.country_identifier,
      sa1_identifier: organisation.sa1_identifier,
      sa2_identifier: organisation.sa2_identifier,
      created_at: organisation.address_created_at,
      updated_at: organisation.address_updated_at,
    } : null,
    created_at: organisation.created_at,
    updated_at: organisation.updated_at,
  };

  return new Response(JSON.stringify(transformedOrganisation), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const updateOrganisationLogic = async (_req: Request, _ctx: ApiContext, id: string, body: unknown) => {
  const data = body as UpdateOrganisationRequest;

  // Start transaction
  const _result = await db.transaction().execute(async (trx) => {
    // Get existing organisation
    const existingOrg = await trx
      .selectFrom('core.organisations')
      .select(['address_id'])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existingOrg) {
      throw new NotFoundError('Organisation not found');
    }

    let addressId = existingOrg.address_id;
    
    // Update or create address if provided
    if (data.address) {
      if (addressId) {
        // Update existing address
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
      } else {
        // Create new address
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
        
        addressId = addressResult?.id || null;
      }
    }

    // Update organisation
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (data.organisation_identifier !== undefined) updateData.organisation_identifier = data.organisation_identifier;
    if (data.organisation_name !== undefined) updateData.organisation_name = data.organisation_name;
    if (data.organisation_type_identifier !== undefined) updateData.organisation_type_identifier = data.organisation_type_identifier;
    if (data.state_identifier !== undefined) updateData.state_identifier = data.state_identifier;
    if (data.phone_number !== undefined) updateData.phone_number = data.phone_number;
    if (data.fax_number !== undefined) updateData.fax_number = data.fax_number;
    if (data.email_address !== undefined) updateData.email_address = data.email_address;
    if (data.contact_name !== undefined) updateData.contact_name = data.contact_name;
    if (addressId !== undefined) updateData.address_id = addressId;

    const organisationResult = await trx
      .updateTable('core.organisations')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return { organisation: organisationResult, addressId };
  });

  // Fetch the complete updated organisation with address
  const completeOrganisation = await db
    .selectFrom('core.organisations')
    .leftJoin('core.addresses', 'core.addresses.id', 'core.organisations.address_id')
    .select([
      'core.organisations.id as id',
      'core.organisations.organisation_identifier as organisation_identifier',
      'core.organisations.organisation_name as organisation_name',
      'core.organisations.organisation_type_identifier as organisation_type_identifier',
      'core.organisations.state_identifier as state_identifier',
      'core.organisations.phone_number as phone_number',
      'core.organisations.fax_number as fax_number',
      'core.organisations.email_address as email_address',
      'core.organisations.contact_name as contact_name',
      'core.organisations.created_at as created_at',
      'core.organisations.updated_at as updated_at',
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
    .where('core.organisations.id', '=', id)
    .executeTakeFirst();

  if (!completeOrganisation) {
    throw new NotFoundError('Organisation not found after update');
  }

  const transformedOrganisation = {
    id: completeOrganisation.id,
    organisation_identifier: completeOrganisation.organisation_identifier,
    organisation_name: completeOrganisation.organisation_name,
    organisation_type_identifier: completeOrganisation.organisation_type_identifier,
    state_identifier: completeOrganisation.state_identifier,
    phone_number: completeOrganisation.phone_number,
    fax_number: completeOrganisation.fax_number,
    email_address: completeOrganisation.email_address,
    contact_name: completeOrganisation.contact_name,
    address_id: completeOrganisation.address_id,
    address: completeOrganisation.address_id ? {
      id: completeOrganisation.address_id,
      building_property_name: completeOrganisation.building_property_name,
      flat_unit_details: completeOrganisation.flat_unit_details,
      street_number: completeOrganisation.street_number,
      street_name: completeOrganisation.street_name,
      suburb: completeOrganisation.suburb,
      postcode: completeOrganisation.postcode,
      state_identifier: completeOrganisation.address_state_identifier,
      country_identifier: completeOrganisation.country_identifier,
      sa1_identifier: completeOrganisation.sa1_identifier,
      sa2_identifier: completeOrganisation.sa2_identifier,
      created_at: completeOrganisation.address_created_at,
      updated_at: completeOrganisation.address_updated_at,
    } : null,
    created_at: completeOrganisation.created_at,
    updated_at: completeOrganisation.updated_at,
  };

  return new Response(JSON.stringify(transformedOrganisation), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const deleteOrganisationLogic = async (_req: Request, _ctx: ApiContext, id: string) => {
  // Check if organisation exists
  const existingOrg = await db
    .selectFrom('core.organisations')
    .select(['id', 'address_id'])
    .where('id', '=', id)
    .executeTakeFirst();

  if (!existingOrg) {
    throw new NotFoundError('Organisation not found');
  }

  // Start transaction to delete organisation and address
  await db.transaction().execute(async (trx) => {
    // Delete organisation first (foreign key constraint)
    await trx
      .deleteFrom('core.organisations')
      .where('id', '=', id)
      .execute();

    // Delete associated address if it exists
    if (existingOrg.address_id) {
      await trx
        .deleteFrom('core.addresses')
        .where('id', '=', existingOrg.address_id)
        .execute();
    }
  });

  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders },
  });
};

// =============================================================================
// ROUTER
// =============================================================================

const router = async (req: Request, ctx: ApiContext, body: unknown): Promise<Response> => {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  // GET /organisations
  if (method === 'GET' && parts.length === 1 && parts[0] === 'organisations') {
    return await listOrganisationsLogic(req, ctx);
  }

  // POST /organisations
  if (method === 'POST' && parts.length === 1 && parts[0] === 'organisations') {
    return await createOrganisationLogic(req, ctx, body);
  }

  // GET /organisations/{id}
  if (method === 'GET' && parts.length === 2 && parts[0] === 'organisations') {
    return await getOrganisationByIdLogic(req, ctx, parts[1]);
  }

  // PUT /organisations/{id}
  if (method === 'PUT' && parts.length === 2 && parts[0] === 'organisations') {
    return await updateOrganisationLogic(req, ctx, parts[1], body);
  }

  // DELETE /organisations/{id}
  if (method === 'DELETE' && parts.length === 2 && parts[0] === 'organisations') {
    return await deleteOrganisationLogic(req, ctx, parts[1]);
  }

  throw new NotFoundError();
};

const handler = createApiRoute(router);
serve(handler);
