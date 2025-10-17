import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
type UploadParams = { studentId: string; file: File };
type DeleteParams = { studentId: string; fileName: string };
type SignedUrlParams = {
  studentId: string;
  fileName: string;
  expiresIn?: number;
};

/**
 * useListStudentFiles
 * Fetches the list of files under the student's folder in the 'students' bucket.
 * @param studentId The student UUID string
 * @returns TanStack Query result with file list
 */
export const useListStudentFiles = (studentId?: string) => {
  return useQuery({
    queryKey: ['student-files', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('students')
        .list(studentId!, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' },
        });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};

/**
 * useUploadStudentFile
 * Uploads a single file to the student's folder.
 * Invalidates the student-files query on success.
 */
export const useUploadStudentFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, file }: UploadParams) => {
      const supabase = createClient();
      const path = `${studentId}/${file.name}`;
      const { error } = await supabase.storage
        .from('students')
        .upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { studentId }) => {
      queryClient.invalidateQueries({
        queryKey: ['student-files', studentId],
      });
    },
  });
};

/**
 * useDeleteStudentFile
 * Deletes a single file from the student's folder.
 * Invalidates the student-files query on success.
 */
export const useDeleteStudentFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, fileName }: DeleteParams) => {
      const supabase = createClient();
      const { error } = await supabase.storage
        .from('students')
        .remove([`${studentId}/${fileName}`]);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { studentId }) => {
      queryClient.invalidateQueries({
        queryKey: ['student-files', studentId],
      });
    },
  });
};

/**
 * useCreateStudentSignedUrl
 * Generates a short-lived signed URL for a file for download/view.
 */
export const useCreateStudentSignedUrl = () => {
  return useMutation({
    mutationFn: async ({
      studentId,
      fileName,
      expiresIn = 60,
    }: SignedUrlParams) => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('students')
        .createSignedUrl(`${studentId}/${fileName}`, expiresIn);
      if (error) throw new Error(error.message);
      return data.signedUrl as string;
    },
  });
};
