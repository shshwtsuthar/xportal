import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type UploadParams = {
  file: File;
  currentPath?: string | null;
};

type DeleteParams = {
  currentPath?: string | null;
};

const SIGNED_URL_TTL_SECONDS = 60;

const getUserRtoId = async () => {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  const rtoId = (
    userData.user?.app_metadata as Record<string, unknown> | undefined
  )?.rto_id as string | undefined;
  if (!rtoId) throw new Error('RTO not found in user metadata');
  return { supabase, rtoId };
};

/**
 * Fetches a signed URL for the provided profile image path.
 * @param profileImagePath Storage object path stored on the RTO record
 * @returns TanStack Query result with the signed URL or null when missing
 */
export const useRtoProfileImageUrl = (profileImagePath?: string | null) => {
  return useQuery({
    queryKey: ['rto-profile-image', profileImagePath],
    enabled: Boolean(profileImagePath),
    queryFn: async () => {
      if (!profileImagePath) return null;
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('rto-assets')
        .createSignedUrl(profileImagePath, SIGNED_URL_TTL_SECONDS);
      if (error) throw new Error(error.message);
      return data.signedUrl as string;
    },
  });
};

/**
 * Uploads a new profile image for the current user's RTO.
 * Replaces the previous asset and updates the profile_image_path column.
 */
export const useUploadRtoProfileImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, currentPath }: UploadParams) => {
      const { supabase, rtoId } = await getUserRtoId();
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const newPath = `${rtoId}/profile/profile-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('rto-assets')
        .upload(newPath, file, { upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { error: updateError } = await supabase
        .from('rtos')
        .update({ profile_image_path: newPath })
        .eq('id', rtoId);
      if (updateError) {
        await supabase.storage
          .from('rto-assets')
          .remove([newPath])
          .catch(() => undefined);
        throw new Error(updateError.message);
      }

      if (currentPath && currentPath !== newPath) {
        await supabase.storage
          .from('rto-assets')
          .remove([currentPath])
          .catch(() => undefined);
      }

      return newPath;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rto'] });
    },
  });
};

/**
 * Removes the current RTO profile image and resets the database column.
 */
export const useDeleteRtoProfileImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ currentPath }: DeleteParams = {}) => {
      const { supabase, rtoId } = await getUserRtoId();

      if (currentPath) {
        await supabase.storage
          .from('rto-assets')
          .remove([currentPath])
          .catch(() => undefined);
      }

      const { error } = await supabase
        .from('rtos')
        .update({ profile_image_path: null })
        .eq('id', rtoId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rto'] });
    },
  });
};
