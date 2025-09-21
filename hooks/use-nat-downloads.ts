/**
 * NAT Downloads Hook
 * 
 * React hook for managing NAT file downloads with state management,
 * progress tracking, and error handling.
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  downloadNAT00010, 
  downloadNAT00020, 
  downloadAllNATFiles,
  validateDataForDownload 
} from '@/lib/services/nat-download-service';
import { DownloadState, NATFileType } from '@/src/types/compliance-types';

export interface DownloadHookOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

/**
 * Hook for managing NAT file downloads
 */
export const useNATDownloads = (options?: DownloadHookOptions) => {
  const [downloadState, setDownloadState] = useState<DownloadState>({
    isDownloading: false
  });

  // Download NAT00010 mutation
  const downloadNAT00010Mutation = useMutation({
    mutationFn: () => downloadNAT00010({
      onProgress: options?.onProgress,
      onComplete: () => {
        setDownloadState({ isDownloading: false });
        options?.onSuccess?.();
      },
      onError: (error) => {
        setDownloadState({ isDownloading: false, error });
        options?.onError?.(error);
      }
    }),
    onMutate: () => {
      setDownloadState({ 
        isDownloading: true, 
        downloadType: 'NAT00010',
        progress: 0 
      });
    }
  });

  // Download NAT00020 mutation
  const downloadNAT00020Mutation = useMutation({
    mutationFn: () => downloadNAT00020({
      onProgress: options?.onProgress,
      onComplete: () => {
        setDownloadState({ isDownloading: false });
        options?.onSuccess?.();
      },
      onError: (error) => {
        setDownloadState({ isDownloading: false, error });
        options?.onError?.(error);
      }
    }),
    onMutate: () => {
      setDownloadState({ 
        isDownloading: true, 
        downloadType: 'NAT00020',
        progress: 0 
      });
    }
  });

  // Download all files mutation
  const downloadAllFilesMutation = useMutation({
    mutationFn: () => downloadAllNATFiles({
      onProgress: options?.onProgress,
      onComplete: () => {
        setDownloadState({ isDownloading: false });
        options?.onSuccess?.();
      },
      onError: (error) => {
        setDownloadState({ isDownloading: false, error });
        options?.onError?.(error);
      }
    }),
    onMutate: () => {
      setDownloadState({ 
        isDownloading: true, 
        downloadType: 'NAT00010', // Will handle both
        progress: 0 
      });
    }
  });

  // Download handlers
  const handleDownloadNAT00010 = useCallback(async () => {
    try {
      await downloadNAT00010Mutation.mutateAsync();
    } catch (error) {
      // Error handling is done in the mutation
    }
  }, [downloadNAT00010Mutation]);

  const handleDownloadNAT00020 = useCallback(async () => {
    try {
      await downloadNAT00020Mutation.mutateAsync();
    } catch (error) {
      // Error handling is done in the mutation
    }
  }, [downloadNAT00020Mutation]);

  const handleDownloadAll = useCallback(async () => {
    try {
      await downloadAllFilesMutation.mutateAsync();
    } catch (error) {
      // Error handling is done in the mutation
    }
  }, [downloadAllFilesMutation]);

  // Validation handlers
  const validateBeforeDownload = useCallback(async (fileType: NATFileType) => {
    return await validateDataForDownload(fileType);
  }, []);

  // Reset download state
  const resetDownloadState = useCallback(() => {
    setDownloadState({ isDownloading: false });
  }, []);

  return {
    // State
    downloadState,
    isDownloading: downloadState.isDownloading,
    downloadType: downloadState.downloadType,
    downloadProgress: downloadState.progress,
    downloadError: downloadState.error,
    
    // Download handlers
    downloadNAT00010: handleDownloadNAT00010,
    downloadNAT00020: handleDownloadNAT00020,
    downloadAll: handleDownloadAll,
    
    // Validation
    validateBeforeDownload,
    
    // Utilities
    resetDownloadState,
    
    // Individual mutation states
    isDownloadingNAT00010: downloadNAT00010Mutation.isPending,
    isDownloadingNAT00020: downloadNAT00020Mutation.isPending,
    isDownloadingAll: downloadAllFilesMutation.isPending,
    
    // Individual mutation errors
    downloadNAT00010Error: downloadNAT00010Mutation.error,
    downloadNAT00020Error: downloadNAT00020Mutation.error,
    downloadAllError: downloadAllFilesMutation.error
  };
};

/**
 * Hook for download button state management
 */
export const useDownloadButtonState = (fileType: NATFileType, status: any) => {
  const { 
    isDownloading, 
    downloadType, 
    downloadError,
    downloadNAT00010,
    downloadNAT00020 
  } = useNATDownloads();

  const isCurrentlyDownloading = isDownloading && downloadType === fileType;
  const canDownload = status?.canDownload && !isDownloading;
  const hasError = !!downloadError;

  const handleDownload = () => {
    if (fileType === 'NAT00010') {
      downloadNAT00010();
    } else if (fileType === 'NAT00020') {
      downloadNAT00020();
    }
  };

  const getButtonText = () => {
    if (isCurrentlyDownloading) {
      return 'Generating...';
    }
    
    if (hasError) {
      return 'Retry Download';
    }
    
    if (!status?.canDownload) {
      return 'Cannot Download';
    }
    
    return `Download ${fileType}`;
  };

  const getButtonVariant = (): "default" | "secondary" | "destructive" => {
    if (hasError) return 'destructive';
    if (!status?.canDownload) return 'secondary';
    return 'default';
  };

  return {
    isCurrentlyDownloading,
    canDownload,
    hasError,
    handleDownload,
    buttonText: getButtonText(),
    buttonVariant: getButtonVariant()
  };
};
