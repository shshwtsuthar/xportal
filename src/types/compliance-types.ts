/**
 * AVETMISS Compliance Types
 * 
 * Defines interfaces and types for NAT file status checking and validation
 * following AVETMISS NAT00010 and NAT00020 specifications.
 */

export type NATFileType = 'NAT00010' | 'NAT00020';

export type ValidationStatus = 'complete' | 'incomplete' | 'error' | 'no_data';

export interface NATFileStatus {
  fileType: NATFileType;
  status: ValidationStatus;
  isComplete: boolean;
  missingFields: string[];
  recordCount: number;
  canDownload: boolean;
  lastUpdated?: string;
  errorMessage?: string;
}

export interface OrganisationValidationData {
  organisation_identifier?: string;
  organisation_name?: string;
  organisation_type_identifier?: string;
  state_identifier?: string;
  phone_number?: string;
  email_address?: string;
  contact_name?: string;
  fax_number?: string;
  address?: {
    building_property_name?: string;
    flat_unit_details?: string;
    street_number?: string;
    street_name?: string;
    suburb?: string;
    postcode?: string;
    state_identifier?: string;
    sa1_identifier?: string;
    sa2_identifier?: string;
  };
}

export interface LocationValidationData {
  location_identifier?: string;
  location_name?: string;
  is_active?: boolean;
  address?: {
    building_property_name?: string;
    flat_unit_details?: string;
    street_number?: string;
    street_name?: string;
    suburb?: string;
    postcode?: string;
    state_identifier?: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  recordCount: number;
  errorMessage?: string;
}

// Field validation rules for NAT00010 (Organisation)
// Based on official AVETMISS Data Element Definitions Edition 2.3
export const NAT00010_REQUIRED_FIELDS = [
  'organisation_identifier',        // Mandatory - RTO identifier
  'organisation_name',              // Mandatory - Organisation legal name
  'organisation_type_identifier',   // Mandatory - Type of training organisation
  'state_identifier',               // Mandatory - State/territory code
  'phone_number',                   // Mandatory - Primary contact phone
  'email_address',                  // Mandatory - Valid email format
  'contact_name',                   // Mandatory - Primary contact person
  'address.suburb',                 // Mandatory - Suburb/locality/town
  'address.postcode',               // Mandatory - 4-digit code or "OSPC"
  'address.state_identifier'         // Mandatory - State/territory code
] as const;

// Optional fields that can be space-padded in NAT00010
export const NAT00010_OPTIONAL_FIELDS = [
  'address.building_property_name', // Optional - Building/property name
  'address.flat_unit_details',      // Optional - Unit/flat details
  'address.street_number',          // Optional - Street number
  'address.street_name',            // Optional - Street name
  'fax_number',                     // Optional - Facsimile number
  'address.sa1_identifier',         // Optional - Statistical area level 1
  'address.sa2_identifier'          // Optional - Statistical area level 2
] as const;

// Field validation rules for NAT00020 (Locations)
export const NAT00020_REQUIRED_FIELDS = [
  'location_identifier',
  'location_name',
  'address.street_name',
  'address.suburb', 
  'address.postcode',
  'address.state_identifier'
] as const;

// AVETMISS field specifications
export interface AVETMISSFieldSpec {
  name: string;
  length: number;
  type: 'A' | 'N'; // Alphanumeric or Numeric
  required: boolean;
  description: string;
}

// NAT00010 field specifications (533 characters total)
export const NAT00010_FIELD_SPECS: AVETMISSFieldSpec[] = [
  { name: 'organisation_identifier', length: 10, type: 'A', required: true, description: 'Training organisation identifier' },
  { name: 'organisation_name', length: 100, type: 'A', required: true, description: 'Training organisation name' },
  { name: 'organisation_type_identifier', length: 2, type: 'A', required: true, description: 'Training organisation type identifier' },
  { name: 'building_property_name', length: 50, type: 'A', required: false, description: 'Address building/property name' },
  { name: 'flat_unit_details', length: 30, type: 'A', required: false, description: 'Address flat/unit details' },
  { name: 'street_number', length: 15, type: 'A', required: false, description: 'Address street number' },
  { name: 'street_name', length: 70, type: 'A', required: true, description: 'Address street name' },
  { name: 'suburb', length: 50, type: 'A', required: true, description: 'Address suburb, locality or town' },
  { name: 'postcode', length: 4, type: 'A', required: true, description: 'Postcode' },
  { name: 'state_identifier', length: 2, type: 'A', required: true, description: 'State identifier' },
  { name: 'phone_number', length: 20, type: 'A', required: true, description: 'Telephone number' },
  { name: 'fax_number', length: 20, type: 'A', required: false, description: 'Facsimile number' },
  { name: 'email_address', length: 80, type: 'A', required: true, description: 'Email address' },
  { name: 'contact_name', length: 60, type: 'A', required: true, description: 'Contact name' },
  { name: 'sa1_identifier', length: 11, type: 'A', required: false, description: 'Statistical area level 1 identifier' },
  { name: 'sa2_identifier', length: 9, type: 'A', required: false, description: 'Statistical area level 2 identifier' }
];

// NAT00020 field specifications (341 characters total per record)
// Based on official AVETMISS Data Element Definitions Edition 2.3
export const NAT00020_FIELD_SPECS: AVETMISSFieldSpec[] = [
  { name: 'organisation_identifier', length: 10, type: 'A', required: true, description: 'Training organisation identifier' },
  { name: 'location_identifier', length: 10, type: 'A', required: true, description: 'Training organisation delivery location identifier' },
  { name: 'location_name', length: 100, type: 'A', required: true, description: 'Training organisation delivery location name' },
  { name: 'building_property_name', length: 50, type: 'A', required: false, description: 'Address building/property name' },
  { name: 'flat_unit_details', length: 30, type: 'A', required: false, description: 'Address flat/unit details' },
  { name: 'street_number', length: 15, type: 'A', required: false, description: 'Address street number' },
  { name: 'street_name', length: 70, type: 'A', required: true, description: 'Address street name' },
  { name: 'suburb', length: 50, type: 'A', required: true, description: 'Address suburb, locality or town' },
  { name: 'postcode', length: 4, type: 'A', required: true, description: 'Postcode' },
  { name: 'state_identifier', length: 2, type: 'A', required: true, description: 'State identifier' }
];

// Download state management
export interface DownloadState {
  isDownloading: boolean;
  downloadType?: NATFileType;
  progress?: number;
  error?: string;
}

// Status card props
export interface StatusCardProps {
  fileType: NATFileType;
  status: NATFileStatus;
  onDownload: () => void;
  isDownloading: boolean;
  organisationData?: OrganisationValidationData; // For NAT00010 field analysis
  locationsData?: LocationValidationData[]; // For NAT00020 field analysis
}

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface FieldValidationRule {
  field: string;
  validator: (value: any) => boolean;
  message: string;
}
