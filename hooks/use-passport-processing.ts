import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getFunctionHeaders } from '@/lib/utils';
import { useApplicationWizard } from '@/stores/application-wizard';

const BASE_URL = 'http://127.0.0.1:54321/functions/v1';

// =============================================================================
// TYPES
// =============================================================================

interface ExtractedPassportData {
  firstName?: string;
  lastName?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  nationality?: string;
  placeOfBirth?: string;
  passportNumber?: string;
  issuingCountry?: string;
  dateOfIssue?: string;
  dateOfExpiry?: string;
  mrzLine1?: string;
  mrzLine2?: string;
}

interface ProcessPassportRequest {
  applicationId: string;
  documentId: string;
  documentPath: string;
}

interface ProcessPassportResponse {
  message: string;
  extractedData: ExtractedPassportData;
  fieldsExtracted: string[];
}

interface UsePassportProcessingProps {
  applicationId: string;
}

// =============================================================================
// HOOK
// =============================================================================

export function usePassportProcessing({ applicationId }: UsePassportProcessingProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastExtractedData, setLastExtractedData] = useState<ExtractedPassportData | null>(null);
  const [lastFieldsExtracted, setLastFieldsExtracted] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { updateFromPassportData } = useApplicationWizard();

  // Process passport mutation
  const processPassportMutation = useMutation({
    mutationFn: async ({ documentId, documentPath }: { 
      documentId: string; 
      documentPath: string; 
    }): Promise<ProcessPassportResponse> => {
      const response = await fetch(`${BASE_URL}/passport-process`, {
        method: 'POST',
        headers: {
          ...getFunctionHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          documentId,
          documentPath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process passport');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setLastExtractedData(data.extractedData);
      setLastFieldsExtracted(data.fieldsExtracted);
      
      // Update the application wizard form data with extracted passport data
      updateFromPassportData(data.extractedData);
      
      // Invalidate application data to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      
      console.log('[PASSPORT_PROCESSED]', {
        fieldsExtracted: data.fieldsExtracted,
        extractedData: data.extractedData,
      });
    },
    onError: (error) => {
      console.error('[PASSPORT_PROCESS_ERROR]', error);
      setLastExtractedData(null);
      setLastFieldsExtracted([]);
    },
  });

  // Process passport function
  const processPassport = useCallback(async (documentId: string, documentPath: string) => {
    if (!applicationId) {
      throw new Error('Application ID is required');
    }

    setIsProcessing(true);
    try {
      await processPassportMutation.mutateAsync({ documentId, documentPath });
    } finally {
      setIsProcessing(false);
    }
  }, [applicationId, processPassportMutation]);

  // Check if a filename contains "passport"
  const isPassportFile = useCallback((filename: string): boolean => {
    return filename.toLowerCase().includes('passport');
  }, []);

  // Get field mapping for UI display
  const getFieldMapping = useCallback(() => {
    if (!lastExtractedData) return {};
    
    return {
      'First Name': lastExtractedData.firstName,
      'Last Name': lastExtractedData.lastName,
      'Gender': lastExtractedData.gender,
      'Date of Birth': lastExtractedData.dateOfBirth,
      'Nationality': lastExtractedData.nationality,
      'Place of Birth': lastExtractedData.placeOfBirth,
      'Passport Number': lastExtractedData.passportNumber,
      'Issuing Country': lastExtractedData.issuingCountry,
      'Date of Issue': lastExtractedData.dateOfIssue,
      'Date of Expiry': lastExtractedData.dateOfExpiry,
    };
  }, [lastExtractedData]);

  // Get emoji for field status
  const getFieldEmoji = useCallback((fieldName: string): string => {
    const mapping = getFieldMapping();
    return mapping[fieldName] ? '✅' : '❌';
  }, [getFieldMapping]);

  // Clear last processing results
  const clearResults = useCallback(() => {
    setLastExtractedData(null);
    setLastFieldsExtracted([]);
  }, []);

  return {
    // State
    isProcessing,
    lastExtractedData,
    lastFieldsExtracted,
    
    // Actions
    processPassport,
    isPassportFile,
    getFieldMapping,
    getFieldEmoji,
    clearResults,
    
    // Error state
    error: processPassportMutation.error,
  };
}
