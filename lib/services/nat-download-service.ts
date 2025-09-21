/**
 * NAT Download Service
 * 
 * Handles individual NAT file generation and browser downloads
 * with proper error handling and user feedback.
 */

import { generateNAT00010, generateNAT00020, generateFilename } from '@/lib/nat-file-generator';
import { toast } from 'sonner';

export interface DownloadOptions {
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

/**
 * Triggers browser download of generated file content
 */
const triggerDownload = (content: string, filename: string): void => {
  try {
    // Create blob with proper MIME type for text files
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up URL object
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Download trigger failed:', error);
    throw new Error('Failed to trigger download. Please try again.');
  }
};

/**
 * Downloads NAT00010 (Organisation) file
 */
export const downloadNAT00010 = async (options?: DownloadOptions): Promise<void> => {
  try {
    options?.onProgress?.(10);
    
    // Fetch organisation data
    const response = await fetch('http://127.0.0.1:54321/functions/v1/organisations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch organisation data: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data) {
      throw new Error('Failed to fetch organisation data');
    }
    
    const organisation = data.organisations?.[0];
    
    if (!organisation) {
      throw new Error('No organisation data found. Please configure organisation settings first.');
    }
    
    options?.onProgress?.(50);
    
    // Generate file content
    const content = generateNAT00010(organisation);
    
    options?.onProgress?.(80);
    
    // Generate filename
    const filename = generateFilename('NAT00010');
    
    // Trigger download
    triggerDownload(content, filename);
    
    options?.onProgress?.(100);
    options?.onComplete?.();
    
    toast.success(`NAT00010 file downloaded successfully as ${filename}`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('NAT00010 download error:', error);
    
    options?.onError?.(errorMessage);
    toast.error(`Failed to download NAT00010: ${errorMessage}`);
    
    throw error;
  }
};

/**
 * Downloads NAT00020 (Locations) file
 */
export const downloadNAT00020 = async (options?: DownloadOptions): Promise<void> => {
  try {
    options?.onProgress?.(10);
    
    // Fetch locations data
    const response = await fetch('http://127.0.0.1:54321/functions/v1/locations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch locations data: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data) {
      throw new Error('Failed to fetch locations data');
    }
    
    const locations = data.locations || [];
    
    // Filter for active locations only
    const activeLocations = locations.filter((loc: any) => loc.is_active);
    
    if (activeLocations.length === 0) {
      throw new Error('No active locations found. Please configure at least one active location.');
    }
    
    options?.onProgress?.(50);
    
    // Generate file content
    const content = generateNAT00020(activeLocations);
    
    options?.onProgress?.(80);
    
    // Generate filename
    const filename = generateFilename('NAT00020');
    
    // Trigger download
    triggerDownload(content, filename);
    
    options?.onProgress?.(100);
    options?.onComplete?.();
    
    toast.success(`NAT00020 file downloaded successfully as ${filename}`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('NAT00020 download error:', error);
    
    options?.onError?.(errorMessage);
    toast.error(`Failed to download NAT00020: ${errorMessage}`);
    
    throw error;
  }
};

/**
 * Downloads both NAT files (NAT00010 and NAT00020)
 */
export const downloadAllNATFiles = async (options?: DownloadOptions): Promise<void> => {
  try {
    options?.onProgress?.(10);
    
    // Download NAT00010 first
    await downloadNAT00010({
      onProgress: (progress) => options?.onProgress?.(progress * 0.5),
      onError: options?.onError
    });
    
    options?.onProgress?.(50);
    
    // Download NAT00020 second
    await downloadNAT00020({
      onProgress: (progress) => options?.onProgress?.(50 + progress * 0.5),
      onError: options?.onError
    });
    
    options?.onProgress?.(100);
    options?.onComplete?.();
    
    toast.success('All NAT files downloaded successfully');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Download all files error:', error);
    
    options?.onError?.(errorMessage);
    toast.error(`Failed to download all files: ${errorMessage}`);
    
    throw error;
  }
};

/**
 * Validates data before download
 */
export const validateDataForDownload = async (fileType: 'NAT00010' | 'NAT00020'): Promise<{
  isValid: boolean;
  missingFields: string[];
  errorMessage?: string;
}> => {
  try {
    if (fileType === 'NAT00010') {
      const response = await fetch('http://127.0.0.1:54321/functions/v1/organisations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      });
      
      if (!response.ok) {
        return {
          isValid: false,
          missingFields: [],
          errorMessage: 'Unable to fetch organisation data'
        };
      }

      const data = await response.json();
      
      const organisation = data.organisations?.[0];
      
      if (!organisation) {
        return {
          isValid: false,
          missingFields: ['No organisation configured'],
          errorMessage: 'No organisation data found'
        };
      }
      
      // Check required fields
      const missingFields: string[] = [];
      
      if (!organisation.organisation_identifier) missingFields.push('organisation_identifier');
      if (!organisation.organisation_name) missingFields.push('organisation_name');
      if (!organisation.organisation_type_identifier) missingFields.push('organisation_type_identifier');
      if (!organisation.phone_number) missingFields.push('phone_number');
      if (!organisation.email_address) missingFields.push('email_address');
      if (!organisation.contact_name) missingFields.push('contact_name');
      
      if (!organisation.address) {
        missingFields.push('address');
      } else {
        if (!organisation.address.street_name) missingFields.push('address.street_name');
        if (!organisation.address.suburb) missingFields.push('address.suburb');
        if (!organisation.address.postcode) missingFields.push('address.postcode');
        if (!organisation.address.state_identifier) missingFields.push('address.state_identifier');
      }
      
      return {
        isValid: missingFields.length === 0,
        missingFields,
        errorMessage: missingFields.length > 0 ? `Missing ${missingFields.length} required fields` : undefined
      };
      
    } else { // NAT00020
      const response = await fetch('http://127.0.0.1:54321/functions/v1/locations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      });
      
      if (!response.ok) {
        return {
          isValid: false,
          missingFields: [],
          errorMessage: 'Unable to fetch locations data'
        };
      }

      const data = await response.json();
      
      const locations = data.locations || [];
      const activeLocations = locations.filter((loc: any) => loc.is_active);
      
      if (activeLocations.length === 0) {
        return {
          isValid: false,
          missingFields: ['No active locations'],
          errorMessage: 'At least one active location is required'
        };
      }
      
      // Check each location for NAT00020 required fields
      const missingFields: string[] = [];
      activeLocations.forEach((location: any, index: number) => {
        const prefix = `location_${index + 1}`;
        
        // Required fields for NAT00020
        if (!location.location_identifier) missingFields.push(`${prefix}.location_identifier`);
        if (!location.location_name) missingFields.push(`${prefix}.location_name`);
        
        if (!location.address) {
          missingFields.push(`${prefix}.address`);
        } else {
          // Required address fields for NAT00020
          if (!location.address.street_name) missingFields.push(`${prefix}.address.street_name`);
          if (!location.address.suburb) missingFields.push(`${prefix}.address.suburb`);
          if (!location.address.postcode) missingFields.push(`${prefix}.address.postcode`);
          if (!location.address.state_identifier) missingFields.push(`${prefix}.address.state_identifier`);
        }
      });
      
      return {
        isValid: missingFields.length === 0,
        missingFields,
        errorMessage: missingFields.length > 0 ? `Missing ${missingFields.length} required fields` : undefined
      };
    }
    
  } catch (error) {
    console.error('Validation error:', error);
    return {
      isValid: false,
      missingFields: [],
      errorMessage: 'Validation failed'
    };
  }
};

/**
 * Gets estimated download time (for progress indication)
 */
export const getEstimatedDownloadTime = (fileType: 'NAT00010' | 'NAT00020', recordCount: number = 1): number => {
  // Base time + time per record
  const baseTime = 1000; // 1 second base
  const timePerRecord = 500; // 0.5 seconds per record
  
  return baseTime + (recordCount * timePerRecord);
};
