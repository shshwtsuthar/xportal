import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables, TablesInsert } from '@/database.types';

type SubjectAssignment = Tables<'subject_assignments'>;

type ListParams = { subjectId?: string };
type CreateParams = {
  subjectId: string;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  visibleFrom?: Date | null;
  visibleTo?: Date | null;
  file: File;
};
type DeleteParams = { assignmentId: string; filePath: string };
type SignedUrlParams = { filePath: string; expiresIn?: number };

/**
 * Fetch assignments for a subject.
 * queryKey: ['subject-assignments', subjectId]
 */
export const useGetSubjectAssignments = ({ subjectId }: ListParams) => {
  return useQuery({
    queryKey: ['subject-assignments', subjectId ?? 'none'],
    enabled: Boolean(subjectId),
    queryFn: async (): Promise<SubjectAssignment[]> => {
      if (!subjectId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('subject_assignments')
        .select('*')
        .eq('subject_id', subjectId)
        .order('due_date', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};

/**
 * Create an assignment for a subject and upload its file.
 * Uploads to bucket 'subject-assignments' at
 * subjects/{subjectId}/assignments/{assignmentId}/{fileName}
 */
export const useCreateSubjectAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      subjectId,
      title,
      description,
      dueDate,
      visibleFrom,
      visibleTo,
      file,
    }: CreateParams) => {
      // Resolve tenant rto_id from subject (satisfies types and RLS)
      const supabase = createClient();
      const { data: subj, error: subjErr } = await supabase
        .from('subjects')
        .select('rto_id')
        .eq('id', subjectId)
        .single();
      if (subjErr || !subj)
        throw new Error(subjErr?.message || 'Subject not found');

      const assignmentId = crypto.randomUUID();
      const fileName = file.name;
      const filePath = `subjects/${subjectId}/assignments/${assignmentId}/${fileName}`;

      // 1) Upload file
      const { error: uploadErr } = await supabase.storage
        .from('subject-assignments')
        .upload(filePath, file, { upsert: false });
      if (uploadErr) throw new Error(uploadErr.message);

      // 2) Insert row with explicit id so path stays consistent
      const insertRow: TablesInsert<'subject_assignments'> = {
        id: assignmentId,
        subject_id: subjectId,
        rto_id: subj.rto_id as string,
        title,
        description: description ?? null,
        due_date: dueDate ? (dueDate as unknown as string) : null,
        visible_from: visibleFrom ? (visibleFrom as unknown as string) : null,
        visible_to: visibleTo ? (visibleTo as unknown as string) : null,
        file_path: filePath,
        file_name: fileName,
        mime_type: file.type || null,
        size_bytes: file.size,
        sha256: null,
      };

      const { error: insertErr } = await supabase
        .from('subject_assignments')
        .insert(insertRow);
      if (insertErr) throw new Error(insertErr.message);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['subject-assignments', variables.subjectId],
      });
    },
  });
};

/**
 * Delete an assignment and its file from storage.
 */
export const useDeleteSubjectAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, filePath }: DeleteParams) => {
      const supabase = createClient();
      // Remove storage object first
      const { error: rmErr } = await supabase.storage
        .from('subject-assignments')
        .remove([filePath]);
      if (rmErr) throw new Error(rmErr.message);
      // Delete DB row
      const { error: delErr } = await supabase
        .from('subject_assignments')
        .delete()
        .eq('id', assignmentId);
      if (delErr) throw new Error(delErr.message);
      return true;
    },
    onSuccess: async () => {
      // Broad invalidation (lists for all subjects)
      await queryClient.invalidateQueries({
        queryKey: ['subject-assignments'],
      });
    },
  });
};

/**
 * Create a signed URL for downloading an assignment file.
 */
export const useCreateAssignmentSignedUrl = () => {
  return useMutation({
    mutationFn: async ({ filePath, expiresIn = 60 }: SignedUrlParams) => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('subject-assignments')
        .createSignedUrl(filePath, expiresIn);
      if (error) throw new Error(error.message);
      return data.signedUrl as string;
    },
  });
};
