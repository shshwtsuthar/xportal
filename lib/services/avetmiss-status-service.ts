/**
 * AVETMISS Status Validation Service
 * 
 * Provides validation logic for NAT00010 (Organisation) and NAT00020 (Locations)
 * data completeness checking according to AVETMISS specifications.
 */

import { 
  NATFileStatus, 
  ValidationStatus, 
  OrganisationValidationData, 
  LocationValidationData,
  ValidationResult,
  NAT00010_REQUIRED_FIELDS,
  NAT00010_OPTIONAL_FIELDS,
  NAT00020_REQUIRED_FIELDS
} from '@/src/types/compliance-types';
import { NATFieldStatus } from '@/components/nat-field-status-table';
import { getFunctionHeaders } from '@/lib/utils';

/**
 * Analyzes individual field status for NAT00020 locations
 */
export const analyzeNAT00020FieldStatus = (locationsData: LocationValidationData[]): NATFieldStatus[] => {
  const fieldStatuses: NATFieldStatus[] = [
    // Required fields for NAT00020
    {
      fieldName: 'location_identifier',
      displayName: 'Training organisation delivery location identifier',
      isAvailable: locationsData.some(loc => !!(loc.location_identifier && loc.location_identifier.trim() !== '')),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'location_name',
      displayName: 'Training organisation delivery location name',
      isAvailable: locationsData.some(loc => !!(loc.location_name && loc.location_name.trim() !== '')),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'address.street_name',
      displayName: 'Address street name',
      isAvailable: locationsData.some(loc => !!(loc.address?.street_name && loc.address.street_name.trim() !== '')),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'address.suburb',
      displayName: 'Address suburb, locality or town',
      isAvailable: locationsData.some(loc => !!(loc.address?.suburb && loc.address.suburb.trim() !== '')),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'address.postcode',
      displayName: 'Postcode',
      isAvailable: locationsData.some(loc => !!(loc.address?.postcode && loc.address.postcode.trim() !== '' && isValidPostcode(loc.address.postcode))),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'address.state_identifier',
      displayName: 'State identifier',
      isAvailable: locationsData.some(loc => !!(loc.address?.state_identifier && loc.address.state_identifier.trim() !== '')),
      isRequired: true,
      isOptional: false
    },
    
    // Optional fields for NAT00020
    {
      fieldName: 'address.building_property_name',
      displayName: 'Address building/property name',
      isAvailable: locationsData.some(loc => !!(loc.address?.building_property_name && loc.address.building_property_name.trim() !== '')),
      isRequired: false,
      isOptional: true
    },
    {
      fieldName: 'address.flat_unit_details',
      displayName: 'Address flat/unit details',
      isAvailable: locationsData.some(loc => !!(loc.address?.flat_unit_details && loc.address.flat_unit_details.trim() !== '')),
      isRequired: false,
      isOptional: true
    },
    {
      fieldName: 'address.street_number',
      displayName: 'Address street number',
      isAvailable: locationsData.some(loc => !!(loc.address?.street_number && loc.address.street_number.trim() !== '')),
      isRequired: false,
      isOptional: true
    }
  ];

  return fieldStatuses;
};

/**
 * Analyzes individual field status for NAT00010
 */
export const analyzeNAT00010FieldStatus = (data: OrganisationValidationData): NATFieldStatus[] => {
  const fieldStatuses: NATFieldStatus[] = [
    // Mandatory fields
    {
      fieldName: 'organisation_identifier',
      displayName: 'Training organisation identifier',
      isAvailable: !!(data.organisation_identifier && data.organisation_identifier.trim() !== ''),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'organisation_name',
      displayName: 'Training organisation name',
      isAvailable: !!(data.organisation_name && data.organisation_name.trim() !== ''),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'organisation_type_identifier',
      displayName: 'Training organisation type identifier',
      isAvailable: !!(data.organisation_type_identifier && data.organisation_type_identifier.trim() !== ''),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'state_identifier',
      displayName: 'State identifier',
      isAvailable: !!(data.state_identifier && data.state_identifier.trim() !== ''),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'phone_number',
      displayName: 'Telephone number',
      isAvailable: !!(data.phone_number && data.phone_number.trim() !== ''),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'email_address',
      displayName: 'Email address',
      isAvailable: !!(data.email_address && data.email_address.trim() !== '' && isValidEmail(data.email_address)),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'contact_name',
      displayName: 'Contact name',
      isAvailable: !!(data.contact_name && data.contact_name.trim() !== ''),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'address.suburb',
      displayName: 'Address suburb, locality or town',
      isAvailable: !!(data.address?.suburb && data.address.suburb.trim() !== ''),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'address.postcode',
      displayName: 'Postcode',
      isAvailable: !!(data.address?.postcode && data.address.postcode.trim() !== '' && isValidPostcode(data.address.postcode)),
      isRequired: true,
      isOptional: false
    },
    {
      fieldName: 'address.state_identifier',
      displayName: 'State identifier (address)',
      isAvailable: !!(data.address?.state_identifier && data.address.state_identifier.trim() !== ''),
      isRequired: true,
      isOptional: false
    },
    
    // Optional fields
    {
      fieldName: 'address.building_property_name',
      displayName: 'Address building/property name',
      isAvailable: !!(data.address?.building_property_name && data.address.building_property_name.trim() !== ''),
      isRequired: false,
      isOptional: true
    },
    {
      fieldName: 'address.flat_unit_details',
      displayName: 'Address flat/unit details',
      isAvailable: !!(data.address?.flat_unit_details && data.address.flat_unit_details.trim() !== ''),
      isRequired: false,
      isOptional: true
    },
    {
      fieldName: 'address.street_number',
      displayName: 'Address street number',
      isAvailable: !!(data.address?.street_number && data.address.street_number.trim() !== ''),
      isRequired: false,
      isOptional: true
    },
    {
      fieldName: 'address.street_name',
      displayName: 'Address street name',
      isAvailable: !!(data.address?.street_name && data.address.street_name.trim() !== ''),
      isRequired: false,
      isOptional: true
    },
    {
      fieldName: 'fax_number',
      displayName: 'Facsimile number',
      isAvailable: !!(data.fax_number && data.fax_number.trim() !== ''),
      isRequired: false,
      isOptional: true
    },
    {
      fieldName: 'address.sa1_identifier',
      displayName: 'Statistical area level 1 identifier',
      isAvailable: !!(data.address?.sa1_identifier && data.address.sa1_identifier.trim() !== ''),
      isRequired: false,
      isOptional: true
    },
    {
      fieldName: 'address.sa2_identifier',
      displayName: 'Statistical area level 2 identifier',
      isAvailable: !!(data.address?.sa2_identifier && data.address.sa2_identifier.trim() !== ''),
      isRequired: false,
      isOptional: true
    }
  ];

  return fieldStatuses;
};

/**
 * Validates organisation data for NAT00010 compliance
 * 
 * Based on official AVETMISS Data Element Definitions Edition 2.3
 * Only validates MANDATORY fields - optional fields can be space-padded
 */
export const validateOrganisationData = (data: OrganisationValidationData): ValidationResult => {
  const missingFields: string[] = [];
  
  // Check required top-level fields
  if (!data.organisation_identifier || data.organisation_identifier.trim() === '') {
    missingFields.push('organisation_identifier');
  }
  
  if (!data.organisation_name || data.organisation_name.trim() === '') {
    missingFields.push('organisation_name');
  }
  
  if (!data.organisation_type_identifier || data.organisation_type_identifier.trim() === '') {
    missingFields.push('organisation_type_identifier');
  }
  
  if (!data.state_identifier || data.state_identifier.trim() === '') {
    missingFields.push('state_identifier');
  }
  
  if (!data.phone_number || data.phone_number.trim() === '') {
    missingFields.push('phone_number');
  }
  
  if (!data.email_address || data.email_address.trim() === '') {
    missingFields.push('email_address');
  }
  
  if (!data.contact_name || data.contact_name.trim() === '') {
    missingFields.push('contact_name');
  }
  
  // Check address fields (only mandatory ones)
  if (!data.address) {
    missingFields.push('address.suburb', 'address.postcode', 'address.state_identifier');
  } else {
    // Note: address.street_name is OPTIONAL according to NAT00010 specification
    // Only check mandatory address fields
    
    if (!data.address.suburb || data.address.suburb.trim() === '') {
      missingFields.push('address.suburb');
    }
    
    if (!data.address.postcode || data.address.postcode.trim() === '') {
      missingFields.push('address.postcode');
    }
    
    if (!data.address.state_identifier || data.address.state_identifier.trim() === '') {
      missingFields.push('address.state_identifier');
    }
  }
  
  // Additional format validation
  if (data.email_address && !isValidEmail(data.email_address)) {
    missingFields.push('email_address (invalid format)');
  }
  
  if (data.address?.postcode && !isValidPostcode(data.address.postcode)) {
    missingFields.push('address.postcode (invalid format)');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    recordCount: 1, // NAT00010 is always exactly 1 record
    errorMessage: missingFields.length > 0 ? `Missing ${missingFields.length} required fields` : undefined
  };
};

/**
 * Validates locations data for NAT00020 compliance
 */
export const validateLocationsData = (data: LocationValidationData[]): ValidationResult => {
  const missingFields: string[] = [];
  let validLocationCount = 0;
  
  if (!data || data.length === 0) {
    return {
      isValid: false,
      missingFields: ['No active locations found'],
      recordCount: 0,
      errorMessage: 'At least one active location is required for NAT00020'
    };
  }
  
  // Check each location
  data.forEach((location, index) => {
    const locationPrefix = `location_${index + 1}`;
    
    if (!location.location_identifier || location.location_identifier.trim() === '') {
      missingFields.push(`${locationPrefix}.location_identifier`);
    }
    
    if (!location.location_name || location.location_name.trim() === '') {
      missingFields.push(`${locationPrefix}.location_name`);
    }
    
    // Check address fields
    if (!location.address) {
      missingFields.push(
        `${locationPrefix}.address.street_name`,
        `${locationPrefix}.address.suburb`, 
        `${locationPrefix}.address.postcode`,
        `${locationPrefix}.address.state_identifier`
      );
    } else {
      if (!location.address.street_name || location.address.street_name.trim() === '') {
        missingFields.push(`${locationPrefix}.address.street_name`);
      }
      
      if (!location.address.suburb || location.address.suburb.trim() === '') {
        missingFields.push(`${locationPrefix}.address.suburb`);
      }
      
      if (!location.address.postcode || location.address.postcode.trim() === '') {
        missingFields.push(`${locationPrefix}.address.postcode`);
      }
      
      if (!location.address.state_identifier || location.address.state_identifier.trim() === '') {
        missingFields.push(`${locationPrefix}.address.state_identifier`);
      }
      
      // Format validation
      if (location.address.postcode && !isValidPostcode(location.address.postcode)) {
        missingFields.push(`${locationPrefix}.address.postcode (invalid format)`);
      }
    }
    
    // Count valid locations
    if (location.is_active && 
        location.location_identifier && 
        location.location_name &&
        location.address?.street_name &&
        location.address?.suburb &&
        location.address?.postcode &&
        location.address?.state_identifier) {
      validLocationCount++;
    }
  });
  
  if (validLocationCount === 0) {
    return {
      isValid: false,
      missingFields: [...missingFields, 'No valid active locations found'],
      recordCount: 0,
      errorMessage: 'At least one complete active location is required for NAT00020'
    };
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    recordCount: validLocationCount,
    errorMessage: missingFields.length > 0 ? `Missing ${missingFields.length} required fields` : undefined
  };
};

/**
 * Checks organisation status for NAT00010 compliance
 */
export const checkOrganisationStatus = async (): Promise<NATFileStatus> => {
  try {
    // Fetch organisation data using direct fetch
    const response = await fetch('http://127.0.0.1:54321/functions/v1/organisations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) {
      return {
        fileType: 'NAT00010',
        status: 'error',
        isComplete: false,
        missingFields: [],
        recordCount: 0,
        canDownload: false,
        errorMessage: 'Unable to load organisation data'
      };
    }

    const data = await response.json();
    
    const organisation = data.organisations?.[0];
    
    if (!organisation) {
      return {
        fileType: 'NAT00010',
        status: 'no_data',
        isComplete: false,
        missingFields: ['No organisation configured'],
        recordCount: 0,
        canDownload: false,
        errorMessage: 'No organisation data found. Please configure organisation settings first.'
      };
    }
    
    const validation = validateOrganisationData(organisation);
    
    return {
      fileType: 'NAT00010',
      status: validation.isValid ? 'complete' : 'incomplete',
      isComplete: validation.isValid,
      missingFields: validation.missingFields,
      recordCount: validation.recordCount,
      canDownload: validation.isValid,
      lastUpdated: organisation.updated_at,
      errorMessage: validation.errorMessage
    };
    
  } catch (error) {
    console.error('Error checking organisation status:', error);
    return {
      fileType: 'NAT00010',
      status: 'error',
      isComplete: false,
      missingFields: [],
      recordCount: 0,
      canDownload: false,
      errorMessage: 'Database connection error'
    };
  }
};

/**
 * Checks locations status for NAT00020 compliance
 */
export const checkLocationsStatus = async (): Promise<NATFileStatus> => {
  try {
    // Fetch locations data using direct fetch
    const response = await fetch('http://127.0.0.1:54321/functions/v1/locations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) {
      return {
        fileType: 'NAT00020',
        status: 'error',
        isComplete: false,
        missingFields: [],
        recordCount: 0,
        canDownload: false,
        errorMessage: 'Unable to load locations data'
      };
    }

    const data = await response.json();
    
    const locations = data.locations || [];
    
    // Filter for active locations only
    const activeLocations = locations.filter((loc: any) => loc.is_active);
    
    const validation = validateLocationsData(activeLocations);
    
    return {
      fileType: 'NAT00020',
      status: validation.isValid ? 'complete' : 'incomplete',
      isComplete: validation.isValid,
      missingFields: validation.missingFields,
      recordCount: validation.recordCount,
      canDownload: validation.isValid,
      lastUpdated: activeLocations.length > 0 ? activeLocations[0].updated_at : undefined,
      errorMessage: validation.errorMessage
    };
    
  } catch (error) {
    console.error('Error checking locations status:', error);
    return {
      fileType: 'NAT00020',
      status: 'error',
      isComplete: false,
      missingFields: [],
      recordCount: 0,
      canDownload: false,
      errorMessage: 'Database connection error'
    };
  }
};

/**
 * Gets raw organisation data for field analysis
 */
export const getOrganisationData = async (): Promise<OrganisationValidationData | undefined> => {
  try {
    const response = await fetch('http://127.0.0.1:54321/functions/v1/organisations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) {
      return undefined;
    }
    
    const data = await response.json();
    const organisation = data.organisations?.[0];
    
    if (!organisation) {
      return undefined;
    }
    
    return {
      organisation_identifier: organisation.organisation_identifier,
      organisation_name: organisation.organisation_name,
      organisation_type_identifier: organisation.organisation_type_identifier,
      state_identifier: organisation.state_identifier,
      phone_number: organisation.phone_number,
      email_address: organisation.email_address,
      contact_name: organisation.contact_name,
      fax_number: organisation.fax_number,
      address: organisation.address ? {
        building_property_name: organisation.address.building_property_name,
        flat_unit_details: organisation.address.flat_unit_details,
        street_number: organisation.address.street_number,
        street_name: organisation.address.street_name,
        suburb: organisation.address.suburb,
        postcode: organisation.address.postcode,
        state_identifier: organisation.address.state_identifier,
        sa1_identifier: organisation.address.sa1_identifier,
        sa2_identifier: organisation.address.sa2_identifier,
      } : undefined
    };
  } catch (error) {
    console.error('Error fetching organisation data:', error);
    return undefined;
  }
};

/**
 * Fetches locations data for validation
 */
export const getLocationsData = async (): Promise<LocationValidationData[]> => {
  try {
    const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1';
    
    const response = await fetch(`${FUNCTIONS_URL}/locations`, {
      headers: getFunctionHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.locations || [];
  } catch (error) {
    console.error('Error fetching locations data:', error);
    return [];
  }
};

/**
 * Checks both organisation and locations status
 */
export const checkAVETMISSStatus = async (): Promise<{
  nat00010Status: NATFileStatus;
  nat00020Status: NATFileStatus;
  organisationData?: OrganisationValidationData;
  locationsData?: LocationValidationData[];
}> => {
  const [nat00010Status, nat00020Status, organisationData, locationsData] = await Promise.all([
    checkOrganisationStatus(),
    checkLocationsStatus(),
    getOrganisationData(),
    getLocationsData()
  ]);
  
  return {
    nat00010Status,
    nat00020Status,
    organisationData,
    locationsData
  };
};

// Utility functions for format validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPostcode = (postcode: string): boolean => {
  // Must be 4 digits or "OSPC" for overseas
  const postcodeRegex = /^\d{4}$|^OSPC$/;
  return postcodeRegex.test(postcode);
};

/**
 * Gets user-friendly field names for display
 */
export const getFieldDisplayName = (fieldPath: string): string => {
  const fieldMap: Record<string, string> = {
    'organisation_identifier': 'RTO Identifier',
    'organisation_name': 'Organisation Name',
    'organisation_type_identifier': 'Organisation Type',
    'state_identifier': 'Primary State',
    'phone_number': 'Phone Number',
    'email_address': 'Email Address',
    'contact_name': 'Contact Name',
    'address.street_name': 'Street Name',
    'address.suburb': 'Suburb',
    'address.postcode': 'Postcode',
    'address.state_identifier': 'State',
    'location_identifier': 'Location ID',
    'location_name': 'Location Name'
  };
  
  return fieldMap[fieldPath] || fieldPath;
};
