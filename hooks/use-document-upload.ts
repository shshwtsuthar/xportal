import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getFunctionHeaders } from '@/lib/utils';
import { usePassportProcessing } from './use-passport-processing';

const BASE_URL = 'http://127.0.0.1:54321/functions/v1';

interface Document {
  id: string;
  path: string;
  doc_type: string;
  version: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  headers: Record<string, string>;
  objectPath: string;
  expiresAt: string;
}

interface ConfirmUploadResponse {
  id: string;
  message: string;
  path: string;
  size: number;
  contentType: string;
}

interface UseDocumentUploadProps {
  applicationId: string;
}

export function useDocumentUpload(applicationId: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const queryClient = useQueryClient();
  
  // Initialize passport processing hook
  const { processPassport, isPassportFile, lastExtractedData, lastFieldsExtracted } = usePassportProcessing({ applicationId });

  // Fetch documents
  const { data: documentsData, isLoading, error } = useQuery({
    queryKey: ['documents', applicationId],
    queryFn: async () => {
      if (!applicationId) return [];
      
      const response = await fetch(`${BASE_URL}/applications/${applicationId}/documents`, {
        headers: getFunctionHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!applicationId,
  });

  // Update local state when data changes
  useEffect(() => {
    if (documentsData) {
      setDocuments(documentsData);
    }
  }, [documentsData]);

  // Generate upload URL mutation
  const generateUploadUrlMutation = useMutation({
    mutationFn: async ({ filename, contentType, category }: { 
      filename: string; 
      contentType: string; 
      category: string; 
    }): Promise<UploadUrlResponse> => {
      const response = await fetch(`${BASE_URL}/applications/${applicationId}/documents/upload-url`, {
        method: 'POST',
        headers: {
          ...getFunctionHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename, contentType, category }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate upload URL');
      }

      return response.json();
    },
  });

  // Confirm upload mutation
  const confirmUploadMutation = useMutation({
    mutationFn: async ({ objectPath, size, hash }: { 
      objectPath: string; 
      size: number; 
      hash?: string; 
    }): Promise<ConfirmUploadResponse> => {
      const response = await fetch(`${BASE_URL}/applications/${applicationId}/documents/confirm`, {
        method: 'POST',
        headers: {
          ...getFunctionHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ objectPath, size, hash }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to confirm upload');
      }

      return response.json();
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      const response = await fetch(`${BASE_URL}/applications/${applicationId}/documents/${documentId}`, {
        method: 'DELETE',
        headers: getFunctionHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete document');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch documents
      queryClient.invalidateQueries({ queryKey: ['documents', applicationId] });
    },
  });

  // Upload file function
  const uploadFile = useCallback(async (file: File, category: string = 'EVIDENCE') => {
    if (!applicationId) {
      throw new Error('Application ID is required');
    }

    try {
      // Step 1: Generate upload URL
      const uploadUrlData = await generateUploadUrlMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
        category,
      });

      // Step 2: Upload file to storage
      const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
        method: 'PUT',
        headers: uploadUrlData.headers,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // Step 3: Confirm upload
      const confirmData = await confirmUploadMutation.mutateAsync({
        objectPath: uploadUrlData.objectPath,
        size: file.size,
      });

      // Step 4: Check if it's a passport file and process it
      if (isPassportFile(file.name)) {
        console.log('[PASSPORT_DETECTED] Processing passport file:', file.name);
        try {
          // Pass the full path with bucket name to passport processing
          const fullDocumentPath = `student-docs/${uploadUrlData.objectPath}`;
          await processPassport(confirmData.id, fullDocumentPath);
        } catch (passportError) {
          console.warn('[PASSPORT_PROCESS_WARNING] Failed to process passport:', passportError);
          // Don't throw here - upload was successful, just passport processing failed
        }
      }

      // Invalidate and refetch documents
      queryClient.invalidateQueries({ queryKey: ['documents', applicationId] });

      return confirmData;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, [applicationId, generateUploadUrlMutation, confirmUploadMutation, queryClient, isPassportFile, processPassport]);

  // Delete document function
  const deleteDocument = useCallback(async (documentId: string) => {
    if (!applicationId) {
      throw new Error('Application ID is required');
    }

    await deleteDocumentMutation.mutateAsync(documentId);
  }, [applicationId, deleteDocumentMutation]);

  // Refresh documents function
  const refreshDocuments = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['documents', applicationId] });
  }, [applicationId, queryClient]);

  return {
    documents,
    isLoading: isLoading || generateUploadUrlMutation.isPending || confirmUploadMutation.isPending,
    error: error || generateUploadUrlMutation.error || confirmUploadMutation.error,
    uploadFile,
    deleteDocument,
    refreshDocuments,
    isUploading: generateUploadUrlMutation.isPending || confirmUploadMutation.isPending,
    isDeleting: deleteDocumentMutation.isPending,
    // Passport processing data
    lastExtractedData,
    lastFieldsExtracted,
  };
}
