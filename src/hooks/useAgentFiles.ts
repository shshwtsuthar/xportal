import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type ListFilesParams = { agentId: string };
type UploadParams = { agentId: string; file: File };
type DeleteParams = { agentId: string; fileName: string };
type SignedUrlParams = {
  agentId: string;
  fileName: string;
  expiresIn?: number;
};

/**
 * useListAgentFiles
 * Fetches the list of files under the agent's folder in the 'agents' bucket.
 * @param agentId The agent UUID string
 * @returns TanStack Query result with file list
 */
export const useListAgentFiles = (agentId?: string) => {
  return useQuery({
    queryKey: ['agent-files', agentId],
    enabled: Boolean(agentId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('agents')
        .list(agentId!, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' },
        });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};

/**
 * useUploadAgentFile
 * Uploads a single file to the agent's folder.
 * Invalidates the agent-files query on success.
 */
export const useUploadAgentFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentId, file }: UploadParams) => {
      const supabase = createClient();
      const path = `${agentId}/${file.name}`;
      const { error } = await supabase.storage
        .from('agents')
        .upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { agentId }) => {
      queryClient.invalidateQueries({
        queryKey: ['agent-files', agentId],
      });
    },
  });
};

/**
 * useDeleteAgentFile
 * Deletes a single file from the agent's folder.
 * Invalidates the agent-files query on success.
 */
export const useDeleteAgentFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentId, fileName }: DeleteParams) => {
      const supabase = createClient();
      const { error } = await supabase.storage
        .from('agents')
        .remove([`${agentId}/${fileName}`]);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { agentId }) => {
      queryClient.invalidateQueries({
        queryKey: ['agent-files', agentId],
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
      agentId,
      fileName,
      expiresIn = 60,
    }: SignedUrlParams) => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('agents')
        .createSignedUrl(`${agentId}/${fileName}`, expiresIn);
      if (error) throw new Error(error.message);
      return data.signedUrl as string;
    },
  });
};
