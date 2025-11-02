import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables, TablesInsert } from '@/database.types';

type Submission = Tables<'student_assignment_submissions'>;

type ListParams = { studentId?: string; subjectId?: string };
type UploadParams = {
  studentId: string;
  subjectId: string;
  enrollmentId?: string | null;
  assignmentId: string;
  file: File;
  notes?: string | null;
};
type UpdateGradeParams = {
  submissionId: string;
  studentId: string;
  subjectId: string;
  grade: 'S' | 'NYS';
};
type DeleteParams = {
  submissionId: string;
  filePath: string;
  studentId: string;
  subjectId: string;
};
type SignedUrlParams = { filePath: string; expiresIn?: number };

/**
 * List submissions for a student and subject.
 * queryKey: ['student-submissions', studentId, subjectId]
 */
export const useGetStudentSubmissions = ({
  studentId,
  subjectId,
}: ListParams) => {
  return useQuery({
    queryKey: ['student-submissions', studentId ?? 'none', subjectId ?? 'none'],
    enabled: Boolean(studentId && subjectId),
    queryFn: async (): Promise<Submission[]> => {
      if (!studentId || !subjectId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('student_assignment_submissions')
        .select('*')
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .order('submitted_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};

/**
 * Upload a submission to 'student-submissions' bucket and insert DB row.
 * Path: students/{studentId}/submissions/{assignmentId}/{submissionId}/{fileName}
 */
export const useUploadStudentSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      subjectId,
      enrollmentId,
      assignmentId,
      file,
      notes,
    }: UploadParams) => {
      // Resolve tenant rto_id from student (satisfies types and RLS)
      const supabase = createClient();
      const { data: stu, error: stuErr } = await supabase
        .from('students')
        .select('rto_id')
        .eq('id', studentId)
        .single();
      if (stuErr || !stu)
        throw new Error(stuErr?.message || 'Student not found');
      const submissionId = crypto.randomUUID();
      const fileName = file.name;
      const filePath = `students/${studentId}/submissions/${assignmentId}/${submissionId}/${fileName}`;
      // 1) Upload
      const { error: upErr } = await supabase.storage
        .from('student-submissions')
        .upload(filePath, file, { upsert: false });
      if (upErr) throw new Error(upErr.message);
      // 2) Insert
      const row: TablesInsert<'student_assignment_submissions'> = {
        id: submissionId,
        student_id: studentId,
        subject_id: subjectId,
        assignment_id: assignmentId,
        enrollment_id: enrollmentId ?? null,
        rto_id: stu.rto_id as string,
        file_path: filePath,
        file_name: fileName,
        mime_type: file.type || null,
        size_bytes: file.size,
        sha256: null,
        notes: notes ?? null,
      };
      const { error: insErr } = await supabase
        .from('student_assignment_submissions')
        .insert(row);
      if (insErr) throw new Error(insErr.message);
    },
    onSuccess: async (_d, v) => {
      await queryClient.invalidateQueries({
        queryKey: ['student-submissions', v.studentId, v.subjectId],
      });
    },
  });
};

/**
 * Update the grade of a student's assignment submission.
 */
export const useUpdateSubmissionGrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, grade }: UpdateGradeParams) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('student_assignment_submissions')
        .update({ grade })
        .eq('id', submissionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: async (_data, { studentId, subjectId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['student-submissions', studentId, subjectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['student-enrollment-subjects', studentId],
        }),
      ]);
    },
  });
};

export const useDeleteStudentSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, filePath }: DeleteParams) => {
      const supabase = createClient();
      const { error: rmErr } = await supabase.storage
        .from('student-submissions')
        .remove([filePath]);
      if (rmErr) throw new Error(rmErr.message);
      const { error: delErr } = await supabase
        .from('student_assignment_submissions')
        .delete()
        .eq('id', submissionId);
      if (delErr) throw new Error(delErr.message);
      return true;
    },
    onSuccess: async (_ok, { studentId, subjectId }) => {
      await queryClient.invalidateQueries({
        queryKey: ['student-submissions', studentId, subjectId],
      });
    },
  });
};

export const useCreateSubmissionSignedUrl = () => {
  return useMutation({
    mutationFn: async ({ filePath, expiresIn = 60 }: SignedUrlParams) => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('student-submissions')
        .createSignedUrl(filePath, expiresIn);
      if (error) throw new Error(error.message);
      return data.signedUrl as string;
    },
  });
};
