import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type ListFilesParams = { applicationId: string };
type UploadParams = { applicationId: string; file: File };
type DeleteParams = { applicationId: string; fileName: string };
type SignedUrlParams = {
  applicationId: string;
  fileName: string;
  expiresIn?: number;
};

/**
 * useListApplicationFiles
 * Fetches the list of files under the application's folder in the 'applications' bucket.
 * @param applicationId The application UUID string
 * @returns TanStack Query result with file list
 */
export const useListApplicationFiles = (applicationId?: string) => {
  return useQuery({
    queryKey: ['application-files', applicationId],
    enabled: Boolean(applicationId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('applications')
        .list(applicationId!, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' },
        });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};

/**
 * useUploadApplicationFile
 * Uploads a single file to the application's folder.
 * Invalidates the application-files query on success.
 */
export const useUploadApplicationFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, file }: UploadParams) => {
      const supabase = createClient();
      const path = `${applicationId}/${file.name}`;
      const { error } = await supabase.storage
        .from('applications')
        .upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { applicationId }) => {
      queryClient.invalidateQueries({
        queryKey: ['application-files', applicationId],
      });
    },
  });
};

/**
 * useDeleteApplicationFile
 * Deletes a single file from the application's folder.
 * Invalidates the application-files query on success.
 */
export const useDeleteApplicationFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, fileName }: DeleteParams) => {
      const supabase = createClient();
      const { error } = await supabase.storage
        .from('applications')
        .remove([`${applicationId}/${fileName}`]);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { applicationId }) => {
      queryClient.invalidateQueries({
        queryKey: ['application-files', applicationId],
      });
    },
  });
};

/**
 * useCreateSignedUrl
 * Generates a short-lived signed URL for a file for download/view.
 */
export const useCreateSignedUrl = () => {
  return useMutation({
    mutationFn: async ({
      applicationId,
      fileName,
      expiresIn = 60,
    }: SignedUrlParams) => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('applications')
        .createSignedUrl(`${applicationId}/${fileName}`, expiresIn);
      if (error) throw new Error(error.message);
      return data.signedUrl as string;
    },
  });
};
