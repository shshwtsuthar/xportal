// =============================================================================
// FILE:        use-organisations.ts
// PROJECT:     XPortal Student Management System (SMS)
// DESCRIPTION: React hooks for organisation management (NAT00010 AVETMISS compliance)
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFunctionHeaders } from '@/lib/utils';

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1';

// =============================================================================
// TYPES
// =============================================================================

export interface Organisation {
  id: string;
  organisation_identifier: string;
  organisation_name: string;
  organisation_type_identifier: string | null;
  state_identifier: string;
  address_id: string | null;
  phone_number: string | null;
  fax_number: string | null;
  email_address: string | null;
  contact_name: string | null;
  address: OrganisationAddress | null;
  created_at: string;
  updated_at: string;
}

export interface OrganisationAddress {
  id: string;
  building_property_name: string | null;
  flat_unit_details: string | null;
  street_number: string | null;
  street_name: string | null;
  suburb: string;
  postcode: string;
  state_identifier: string;
  country_identifier: string;
  sa1_identifier: string | null;
  sa2_identifier: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOrganisationRequest {
  organisation_identifier: string;
  organisation_name: string;
  organisation_type_identifier: string;
  state_identifier: string;
  address?: CreateOrganisationAddressRequest;
  phone_number?: string;
  fax_number?: string;
  email_address?: string;
  contact_name?: string;
}

export interface CreateOrganisationAddressRequest {
  building_property_name?: string;
  flat_unit_details?: string;
  street_number?: string;
  street_name?: string;
  suburb: string;
  postcode: string;
  state_identifier: string;
  country_identifier?: string;
  sa1_identifier?: string;
  sa2_identifier?: string;
}

export interface UpdateOrganisationRequest {
  organisation_identifier?: string;
  organisation_name?: string;
  organisation_type_identifier?: string;
  state_identifier?: string;
  address?: UpdateOrganisationAddressRequest;
  phone_number?: string;
  fax_number?: string;
  email_address?: string;
  contact_name?: string;
}

export interface UpdateOrganisationAddressRequest {
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
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

const fetchOrganisations = async (): Promise<Organisation[]> => {
  const response = await fetch(`${FUNCTIONS_URL}/organisations`, {
    headers: getFunctionHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch organisations');
  }

  const data = await response.json();
  return data.organisations;
};

const fetchOrganisation = async (id: string): Promise<Organisation> => {
  const response = await fetch(`${FUNCTIONS_URL}/organisations/${id}`, {
    headers: getFunctionHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch organisation');
  }

  return response.json();
};

const createOrganisation = async (data: CreateOrganisationRequest): Promise<Organisation> => {
  const response = await fetch(`${FUNCTIONS_URL}/organisations`, {
    method: 'POST',
    headers: getFunctionHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create organisation');
  }

  return response.json();
};

const updateOrganisation = async ({ 
  id, 
  data 
}: { 
  id: string; 
  data: UpdateOrganisationRequest; 
}): Promise<Organisation> => {
  const response = await fetch(`${FUNCTIONS_URL}/organisations/${id}`, {
    method: 'PUT',
    headers: getFunctionHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update organisation');
  }

  return response.json();
};

const deleteOrganisation = async (id: string): Promise<void> => {
  const response = await fetch(`${FUNCTIONS_URL}/organisations/${id}`, {
    method: 'DELETE',
    headers: getFunctionHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete organisation');
  }
};

// =============================================================================
// REACT HOOKS
// =============================================================================

export const useOrganisations = () => {
  return useQuery({
    queryKey: ['organisations'],
    queryFn: fetchOrganisations,
  });
};

export const useOrganisation = (id: string) => {
  return useQuery({
    queryKey: ['organisations', id],
    queryFn: () => fetchOrganisation(id),
    enabled: !!id,
  });
};

export const useCreateOrganisation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrganisation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
    },
  });
};

export const useUpdateOrganisation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrganisation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      queryClient.invalidateQueries({ queryKey: ['organisations', data.id] });
    },
  });
};

export const useDeleteOrganisation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOrganisation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
    },
  });
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const getOrganisationTypeLabel = (typeId: string): string => {
  const types: Record<string, string> = {
    '21': 'School - Government',
    '25': 'School - Catholic',
    '27': 'School - Independent',
    '31': 'TAFE/Skills Institute',
    '41': 'University - Government',
    '43': 'University - Catholic',
    '45': 'University - Independent',
    '51': 'Enterprise - Government',
    '53': 'Enterprise - Non-government',
    '61': 'Community Adult Education',
    '91': 'Private Training Business',
    '93': 'Professional Association',
    '95': 'Industry Association',
    '97': 'Equipment/Product Manufacturer',
    '99': 'Other Training Provider',
  };
  
  return types[typeId] || typeId;
};

export const getStateLabel = (stateId: string): string => {
  const states: Record<string, string> = {
    '01': 'NSW',
    '02': 'VIC',
    '03': 'QLD',
    '04': 'SA',
    '05': 'WA',
    '06': 'TAS',
    '07': 'NT',
    '08': 'ACT',
  };
  
  return states[stateId] || stateId;
};

export const formatAddress = (address: OrganisationAddress): string => {
  const parts = [
    address.building_property_name,
    address.flat_unit_details,
    address.street_number && address.street_name ? `${address.street_number} ${address.street_name}` : null,
    address.suburb,
    address.postcode,
    getStateLabel(address.state_identifier),
  ].filter(Boolean);
  
  return parts.join(', ');
};
