// =============================================================================
// FILE:        use-locations.ts
// PROJECT:     XPortal Student Management System (SMS)
// DESCRIPTION: React hooks for location management (NAT00020 AVETMISS compliance)
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFunctionHeaders } from '@/lib/utils';

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1';

// =============================================================================
// TYPES
// =============================================================================

export interface Location {
  id: string;
  organisation_id: string;
  location_identifier: string;
  location_name: string;
  address_id: string;
  address: OrganisationAddress;
  is_active: boolean;
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

export interface CreateLocationRequest {
  organisation_id: string;
  location_identifier: string;
  location_name: string;
  address: CreateOrganisationAddressRequest;
  is_active?: boolean;
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

export interface UpdateLocationRequest {
  location_identifier?: string;
  location_name?: string;
  address?: UpdateOrganisationAddressRequest;
  is_active?: boolean;
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

const fetchLocations = async (): Promise<Location[]> => {
  const response = await fetch(`${FUNCTIONS_URL}/locations`, {
    headers: getFunctionHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch locations');
  }

  const data = await response.json();
  return data.locations;
};

const fetchLocation = async (id: string): Promise<Location> => {
  const response = await fetch(`${FUNCTIONS_URL}/locations/${id}`, {
    headers: getFunctionHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch location');
  }

  return response.json();
};

const createLocation = async (data: CreateLocationRequest): Promise<Location> => {
  const response = await fetch(`${FUNCTIONS_URL}/locations`, {
    method: 'POST',
    headers: getFunctionHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create location');
  }

  return response.json();
};

const updateLocation = async ({ 
  id, 
  data 
}: { 
  id: string; 
  data: UpdateLocationRequest; 
}): Promise<Location> => {
  const response = await fetch(`${FUNCTIONS_URL}/locations/${id}`, {
    method: 'PUT',
    headers: getFunctionHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update location');
  }

  return response.json();
};

const deleteLocation = async (id: string): Promise<void> => {
  const response = await fetch(`${FUNCTIONS_URL}/locations/${id}`, {
    method: 'DELETE',
    headers: getFunctionHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete location');
  }
};

const toggleLocationStatus = async (id: string): Promise<Location> => {
  const response = await fetch(`${FUNCTIONS_URL}/locations/${id}/toggle-status`, {
    method: 'PATCH',
    headers: getFunctionHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to toggle location status');
  }

  return response.json();
};

// =============================================================================
// REACT HOOKS
// =============================================================================

export const useLocations = () => {
  return useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });
};

export const useLocation = (id: string) => {
  return useQuery({
    queryKey: ['locations', id],
    queryFn: () => fetchLocation(id),
    enabled: !!id,
  });
};

export const useCreateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
};

export const useUpdateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLocation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations', data.id] });
    },
  });
};

export const useDeleteLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
};

export const useToggleLocationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleLocationStatus,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations', data.id] });
    },
  });
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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

export const getLocationStatusBadgeVariant = (isActive: boolean) => {
  return isActive ? 'default' : 'secondary';
};

export const getLocationStatusLabel = (isActive: boolean) => {
  return isActive ? 'Active' : 'Inactive';
};

export const transformLocationsForSelect = (locations: Location[] | undefined) => {
  if (!locations) return [];
  return locations.map(location => ({
    value: location.id,
    label: `${location.location_name} (${location.location_identifier})`,
  }));
};