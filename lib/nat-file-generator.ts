/**
 * NAT File Generator
 * 
 * Generates AVETMISS NAT00010 (Organisation) and NAT00020 (Locations) files
 * with proper field padding and DOS line endings according to specifications.
 */

import { NAT00010_FIELD_SPECS, NAT00020_FIELD_SPECS } from '@/src/types/compliance-types';

/**
 * Critical field padding function based on sample file analysis
 * This is the most important function - exact character positioning is required
 */
export const padField = (value: string | null | undefined, length: number, type: 'A' | 'N' = 'A'): string => {
  const str = (value || '').toString();
  
  if (type === 'N') {
    // Numeric: right-justified, zero-padded
    return str.padStart(length, '0').substring(0, length);
  } else {
    // Alphanumeric: left-justified, space-padded
    return str.padEnd(length, ' ').substring(0, length);
  }
};

/**
 * Generates NAT00010 file content (Organisation record)
 * Based on sample: "90855     Chemcert Training Group Pty Ltd"
 * Total length: 533 characters (without line endings)
 */
export const generateNAT00010 = (organisationData: any): string => {
  const fields: string[] = [];
  
  // Field 1: Organisation identifier (10 chars)
  fields.push(padField(organisationData.organisation_identifier, 10, 'A'));
  
  // Field 2: Organisation name (100 chars)
  fields.push(padField(organisationData.organisation_name, 100, 'A'));
  
  // Field 3: Organisation type identifier (2 chars)
  fields.push(padField(organisationData.organisation_type_identifier, 2, 'A'));
  
  // Field 4: Building/property name (50 chars)
  fields.push(padField(organisationData.address?.building_property_name, 50, 'A'));
  
  // Field 5: Flat/unit details (30 chars)
  fields.push(padField(organisationData.address?.flat_unit_details, 30, 'A'));
  
  // Field 6: Street number (15 chars)
  fields.push(padField(organisationData.address?.street_number, 15, 'A'));
  
  // Field 7: Street name (70 chars)
  fields.push(padField(organisationData.address?.street_name, 70, 'A'));
  
  // Field 8: Suburb (50 chars)
  fields.push(padField(organisationData.address?.suburb, 50, 'A'));
  
  // Field 9: Postcode (4 chars)
  fields.push(padField(organisationData.address?.postcode, 4, 'A'));
  
  // Field 10: State identifier (2 chars) - Position 332-333
  fields.push(padField(organisationData.address?.state_identifier, 2, 'A'));
  
  // Field 11: Phone number (20 chars) - Position 334-353
  fields.push(padField(organisationData.phone_number, 20, 'A'));
  
  // Field 12: Fax number (20 chars) - Position 354-373
  fields.push(padField(organisationData.fax_number, 20, 'A'));
  
  // Field 13: Email address (80 chars) - Position 374-453
  fields.push(padField(organisationData.email_address, 80, 'A'));
  
  // Field 14: Contact name (60 chars) - Position 454-513
  fields.push(padField(organisationData.contact_name, 60, 'A'));
  
  // Field 15: SA1 identifier (11 chars) - Position 514-524
  fields.push(padField(organisationData.address?.sa1_identifier, 11, 'A'));
  
  // Field 16: SA2 identifier (9 chars) - Position 525-533
  fields.push(padField(organisationData.address?.sa2_identifier, 9, 'A'));
  
  // Join all fields and add DOS line ending
  const content = fields.join('');
  
  // Comprehensive debug logging
  console.log('=== NAT00010 FIELD DEBUG ===');
  console.log('Total fields:', fields.length);
  console.log('Expected fields: 16');
  
  // Debug each field individually
  const fieldNames = [
    'Organisation identifier', 'Organisation name', 'Organisation type', 
    'Building name', 'Unit details', 'Street number', 'Street name', 'Suburb',
    'Postcode', 'State', 'Phone', 'Fax', 'Email', 'Contact name', 'SA1', 'SA2'
  ];
  
  let totalLength = 0;
  fields.forEach((field, index) => {
    const expectedLengths = [10, 100, 2, 50, 30, 15, 70, 50, 4, 2, 20, 20, 80, 60, 11, 9];
    const actualLength = field.length;
    const expectedLength = expectedLengths[index];
    
    console.log(`Field ${index + 1} (${fieldNames[index]}): ${actualLength} chars (expected: ${expectedLength})`);
    
    if (actualLength !== expectedLength) {
      console.error(`❌ FIELD ${index + 1} LENGTH MISMATCH!`);
    }
    
    totalLength += actualLength;
  });
  
  console.log('Total content length:', totalLength);
  console.log('Expected total: 533');
  console.log('SA1 value:', organisationData.address?.sa1_identifier);
  console.log('SA2 value:', organisationData.address?.sa2_identifier);
  console.log('Contact name value:', organisationData.contact_name);
  console.log('Email value:', organisationData.email_address);
  console.log('===========================');
  
  return content + '\r\n';
};

/**
 * Generates NAT00020 file content (Locations records)
 * Based on AVETMISS specification: exactly 341 characters per record
 * Field structure: Organisation ID (10) + Location ID (10) + Location Name (100) + 
 *                  Building Name (50) + Unit Details (30) + Street Number (15) + 
 *                  Street Name (70) + Suburb (50) + Postcode (4) + State (2) = 341 chars
 */
export const generateNAT00020 = (locationsData: any[]): string => {
  const records: string[] = [];
  
  // Filter for active locations only
  const activeLocations = locationsData.filter(loc => loc.is_active);
  
  activeLocations.forEach(location => {
    const fields: string[] = [];
    
    // Field 1: Training organisation identifier (10 chars) - Position 1-10
    fields.push(padField(location.organisation_id || location.organisation_identifier, 10, 'A'));
    
    // Field 2: Training organisation delivery location identifier (10 chars) - Position 11-20
    fields.push(padField(location.location_identifier, 10, 'A'));
    
    // Field 3: Training organisation delivery location name (100 chars) - Position 21-120
    fields.push(padField(location.location_name, 100, 'A'));
    
    // Field 4: Address building/property name (50 chars) - Position 121-170
    fields.push(padField(location.address?.building_property_name, 50, 'A'));
    
    // Field 5: Address flat/unit details (30 chars) - Position 171-200
    fields.push(padField(location.address?.flat_unit_details, 30, 'A'));
    
    // Field 6: Address street number (15 chars) - Position 201-215
    fields.push(padField(location.address?.street_number, 15, 'A'));
    
    // Field 7: Address street name (70 chars) - Position 216-285
    fields.push(padField(location.address?.street_name, 70, 'A'));
    
    // Field 8: Address suburb, locality or town (50 chars) - Position 286-335
    fields.push(padField(location.address?.suburb, 50, 'A'));
    
    // Field 9: Postcode (4 chars) - Position 336-339
    fields.push(padField(location.address?.postcode, 4, 'A'));
    
    // Field 10: State identifier (2 chars) - Position 340-341
    fields.push(padField(location.address?.state_identifier, 2, 'A'));
    
    // Join all fields and add DOS line ending
    const content = fields.join('');
    
    // Comprehensive debug logging for NAT00020
    console.log('=== NAT00020 FIELD DEBUG ===');
    console.log('Location:', location.location_name);
    console.log('Total fields:', fields.length);
    console.log('Expected fields: 10');
    
    // Debug each field individually
    const fieldNames = [
      'Organisation identifier', 'Location identifier', 'Location name', 
      'Building name', 'Unit details', 'Street number', 'Street name', 'Suburb',
      'Postcode', 'State'
    ];
    
    let totalLength = 0;
    fields.forEach((field, index) => {
      const expectedLengths = [10, 10, 100, 50, 30, 15, 70, 50, 4, 2];
      const actualLength = field.length;
      const expectedLength = expectedLengths[index];
      
      console.log(`Field ${index + 1} (${fieldNames[index]}): ${actualLength} chars (expected: ${expectedLength})`);
      
      if (actualLength !== expectedLength) {
        console.error(`❌ FIELD ${index + 1} LENGTH MISMATCH!`);
      }
      
      totalLength += actualLength;
    });
    
    console.log('Total content length:', totalLength);
    console.log('Expected total: 341');
    console.log('===========================');
    
    // Validate total length
    if (totalLength !== 341) {
      console.error(`❌ NAT00020 RECORD LENGTH MISMATCH! Expected 341, got ${totalLength}`);
    }
    
    records.push(content + '\r\n');
  });
  
  return records.join('');
};

/**
 * Generates filename with Australian timestamp format
 * Format: NAT[file-number]_YYYYMMDD_HHMM.txt
 */
export const generateFilename = (fileType: 'NAT00010' | 'NAT00020'): string => {
  const now = new Date();
  
  // Australian timezone
  const australianTime = new Date(now.toLocaleString("en-US", {timeZone: "Australia/Melbourne"}));
  
  const year = australianTime.getFullYear();
  const month = String(australianTime.getMonth() + 1).padStart(2, '0');
  const day = String(australianTime.getDate()).padStart(2, '0');
  const hour = String(australianTime.getHours()).padStart(2, '0');
  const minute = String(australianTime.getMinutes()).padStart(2, '0');
  
  return `${fileType}_${year}${month}${day}_${hour}${minute}.txt`;
};

/**
 * Validates that generated file matches expected length
 */
export const validateFileLength = (content: string, expectedLength: number): boolean => {
  // Remove line endings for length check
  const contentWithoutLineEndings = content.replace(/\r\n/g, '');
  return contentWithoutLineEndings.length === expectedLength;
};

/**
 * Debug function to show field positions (for development)
 */
export const debugFieldPositions = (fileType: 'NAT00010' | 'NAT00020'): void => {
  const specs = fileType === 'NAT00010' ? NAT00010_FIELD_SPECS : NAT00020_FIELD_SPECS;
  let position = 1;
  
  console.log(`\n${fileType} Field Positions:`);
  console.log('=====================================');
  
  specs.forEach(spec => {
    console.log(`Position ${position}-${position + spec.length - 1}: ${spec.name} (${spec.length} chars, ${spec.type})`);
    position += spec.length;
  });
  
  console.log(`Total length: ${position - 1} characters`);
};

/**
 * Test data generator for development
 */
export const generateTestNAT00010 = (): string => {
  const testOrg = {
    organisation_identifier: '90855',
    organisation_name: 'Test Training Organisation Pty Ltd',
    organisation_type_identifier: '91',
    phone_number: '03 9123 4567',
    fax_number: '03 9123 4568',
    email_address: 'test@example.com',
    contact_name: 'John Smith',
    address: {
      building_property_name: 'Test Building',
      flat_unit_details: 'Suite 1',
      street_number: '123',
      street_name: 'Test Street',
      suburb: 'Test Suburb',
      postcode: '3000',
      state_identifier: '02',
      country_identifier: '1101',
      sa1_identifier: '12345678901',
      sa2_identifier: '123456789'
    }
  };
  
  return generateNAT00010(testOrg);
};

/**
 * Test data generator for NAT00020
 */
export const generateTestNAT00020 = (): string => {
  const testLocations = [
    {
      organisation_identifier: '90855',
      location_identifier: 'TPL1',
      location_name: 'Test Training Location 1',
      is_active: true,
      address: {
        building_property_name: 'Test Building 1',
        flat_unit_details: 'Suite 1',
        street_number: '123',
        street_name: 'Test Street',
        suburb: 'Test Suburb',
        postcode: '3000',
        state_identifier: '02'
      }
    },
    {
      organisation_identifier: '90855',
      location_identifier: 'TPL2',
      location_name: 'Test Training Location 2',
      is_active: true,
      address: {
        building_property_name: 'Test Building 2',
        flat_unit_details: 'Suite 2',
        street_number: '456',
        street_name: 'Another Street',
        suburb: 'Another Suburb',
        postcode: '4000',
        state_identifier: '03'
      }
    }
  ];
  
  return generateNAT00020(testLocations);
};
