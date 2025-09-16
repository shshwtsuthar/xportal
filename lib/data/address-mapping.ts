// =============================================================================
// ADDRESS MAPPING UTILITIES
// Purpose: Maps between Addressable API response format and our internal format
// =============================================================================

// State mapping from full names to state codes
export const STATE_MAPPING: Record<string, string> = {
  'Victoria': 'VIC',
  'New South Wales': 'NSW',
  'Queensland': 'QLD',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  'Tasmania': 'TAS',
  'Northern Territory': 'NT',
  'Australian Capital Territory': 'ACT',
  // Handle variations
  'NSW': 'NSW',
  'VIC': 'VIC',
  'QLD': 'QLD',
  'SA': 'SA',
  'WA': 'WA',
  'TAS': 'TAS',
  'NT': 'NT',
  'ACT': 'ACT',
};

// Addressable API response types
export interface AddressableAddressAU {
  building_name: string | null;
  unit_details: string | null;
  street_number: string;
  street: string;
  locality: string;
  region: string;
  postcode: string;
  meshblock: string;
  lon: string;
  lat: string;
  formatted: string;
}

export interface AddressableAddressNZ {
  street_number: string;
  street: string;
  locality: string;
  city: string;
  region: string;
  postcode: string;
  meshblock: string;
  lon: string;
  lat: string;
  formatted: string;
}

export type AddressableAddress = AddressableAddressAU | AddressableAddressNZ;

// Our internal address format
export interface MappedAddress {
  streetNumber: string;
  streetName: string;
  unitDetails?: string;
  buildingName?: string;
  suburb: string;
  state: string;
  postcode: string;
  formatted: string;
}

/**
 * Maps Addressable API response to our internal address format
 */
export function mapAddressableResponse(address: AddressableAddress): MappedAddress {
  // Check if it's AU format (has building_name and unit_details)
  const isAU = 'building_name' in address;
  
  if (isAU) {
    const auAddress = address as AddressableAddressAU;
    return {
      streetNumber: auAddress.street_number,
      streetName: auAddress.street,
      unitDetails: auAddress.unit_details || undefined,
      buildingName: auAddress.building_name || undefined,
      suburb: auAddress.locality,
      state: mapStateToCode(auAddress.region),
      postcode: auAddress.postcode,
      formatted: auAddress.formatted,
    };
  } else {
    const nzAddress = address as AddressableAddressNZ;
    return {
      streetNumber: nzAddress.street_number,
      streetName: nzAddress.street,
      suburb: nzAddress.locality,
      state: mapStateToCode(nzAddress.region),
      postcode: nzAddress.postcode,
      formatted: nzAddress.formatted,
    };
  }
}

/**
 * Maps state names to state codes
 */
export function mapStateToCode(stateName: string): string {
  const mapped = STATE_MAPPING[stateName];
  if (!mapped) {
    console.warn(`Unknown state name: ${stateName}`);
    return stateName; // Return original if not found
  }
  return mapped;
}

/**
 * Validates that a state code is valid for our form
 */
export function isValidStateCode(stateCode: string): boolean {
  const validStates = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
  return validStates.includes(stateCode);
}
