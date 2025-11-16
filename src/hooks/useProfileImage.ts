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

const getCurrentUserId = async () => {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  const userId = userData.user?.id;
  if (!userId) throw new Error('User not authenticated');
  return { supabase, userId };
};

/**
 * Fetches a signed URL for the provided profile image path.
 * @param profileImagePath Storage object path stored on the profile record
 * @returns TanStack Query result with the signed URL or null when missing
 */
export const useProfileImageUrl = (profileImagePath?: string | null) => {
  return useQuery({
    queryKey: ['profile-image', profileImagePath],
    enabled: Boolean(profileImagePath),
    queryFn: async () => {
      if (!profileImagePath) return null;
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('user-profiles')
        .createSignedUrl(profileImagePath, SIGNED_URL_TTL_SECONDS);
      if (error) throw new Error(error.message);
      return data.signedUrl as string;
    },
  });
};

/**
 * Uploads a new profile image for the current user.
 * Replaces the previous asset and updates the profile_image_path column.
 */
export const useUploadProfileImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, currentPath }: UploadParams) => {
      const { supabase, userId } = await getCurrentUserId();
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const newPath = `${userId}/profile/profile-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('user-profiles')
        .upload(newPath, file, { upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image_path: newPath })
        .eq('id', userId);
      if (updateError) {
        await supabase.storage
          .from('user-profiles')
          .remove([newPath])
          .catch(() => undefined);
        throw new Error(updateError.message);
      }

      if (currentPath && currentPath !== newPath) {
        await supabase.storage
          .from('user-profiles')
          .remove([currentPath])
          .catch(() => undefined);
      }

      return newPath;
    },
    onSuccess: (newPath) => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['profile-image'] });
    },
  });
};

/**
 * Removes the current user's profile image and resets the database column.
 */
export const useDeleteProfileImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ currentPath }: DeleteParams = {}) => {
      const { supabase, userId } = await getCurrentUserId();

      if (currentPath) {
        await supabase.storage
          .from('user-profiles')
          .remove([currentPath])
          .catch(() => undefined);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ profile_image_path: null })
        .eq('id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['profile-image'] });
    },
  });
};
