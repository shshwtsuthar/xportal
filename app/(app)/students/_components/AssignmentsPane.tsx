'use client';

import { KeyboardEvent, useMemo, useState } from 'react';
import { Tables } from '@/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Plus, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGetStudentEnrollmentSubjects } from '@/src/hooks/useGetStudentEnrollmentSubjects';
import {
  useGetSubjectAssignments,
  useCreateSubjectAssignment,
  useCreateAssignmentSignedUrl,
} from '@/src/hooks/useSubjectAssignments';
import {
  useCreateSubmissionSignedUrl,
  useGetStudentSubmissions,
  useUploadStudentSubmission,
  useUpdateSubmissionGrade,
} from '@/src/hooks/useStudentSubmissions';

type AssignmentsPaneMode = 'staff' | 'student';

type Props = { studentId: string; mode?: AssignmentsPaneMode };

type StudentSubmission = Tables<'student_assignment_submissions'>;

type ParsedSubmission = StudentSubmission & {
  description: string | null;
};

type SubmissionGroups = {
  student: ParsedSubmission[];
  trainer: ParsedSubmission[];
};

const parseSubmissionNotes = (
  notes: string | null
): { kind: 'student' | 'trainer'; description: string | null } => {
  if (!notes) {
    return { kind: 'student', description: null };
  }

  const trimmed = notes.trim();
  if (!trimmed) {
    return { kind: 'student', description: null };
  }

  const looksLikeJson = trimmed.startsWith('{') && trimmed.endsWith('}');
  if (looksLikeJson) {
    try {
      const parsed = JSON.parse(trimmed) as {
        type?: string;
        message?: unknown;
      };
      if (parsed?.type === 'trainer-feedback') {
        const message =
          typeof parsed?.message === 'string' &&
          parsed.message.trim().length > 0
            ? parsed.message.trim()
            : null;
        return { kind: 'trainer', description: message };
      }
    } catch (_err) {
      // Fallback to treating the value as a plain string below.
    }
  }

  return { kind: 'student', description: trimmed };
};

export function AssignmentsPane({ studentId, mode = 'staff' }: Props) {
  const { data: enrollmentSubjects = [] } =
    useGetStudentEnrollmentSubjects(studentId);

  const [selectedSubjectId, setSelectedSubjectId] = useState<
    string | undefined
  >(enrollmentSubjects[0]?.program_plan_subjects?.subject_id);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | undefined
  >(undefined);

  const selectedSubject = useMemo(() => {
    return enrollmentSubjects.find(
      (s) => s.program_plan_subjects?.subject_id === selectedSubjectId
    );
  }, [enrollmentSubjects, selectedSubjectId]);

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedAssignmentId(undefined); // Reset assignment selection when subject changes
  };

  const handleSubjectKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    subjectId: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSubjectChange(subjectId);
    }
  };

  const { data: assignments = [] } = useGetSubjectAssignments({
    subjectId: selectedSubjectId,
  });
  const { data: allSubmissions = [] } = useGetStudentSubmissions({
    studentId,
    subjectId: selectedSubjectId,
  });

  const selectedAssignment = useMemo(() => {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }, [assignments, selectedAssignmentId]);

  const submissions = useMemo(() => {
    if (!selectedAssignmentId) return [];
    return allSubmissions.filter(
      (s) => s.assignment_id === selectedAssignmentId
    );
  }, [allSubmissions, selectedAssignmentId]);

  const submissionGroups = useMemo<SubmissionGroups>(() => {
    return submissions.reduce<SubmissionGroups>(
      (acc, submission) => {
        const parsed = parseSubmissionNotes(submission.notes);
        const record: ParsedSubmission = {
          ...submission,
          description: parsed.description,
        };
        if (parsed.kind === 'trainer') {
          acc.trainer.push(record);
        } else {
          acc.student.push(record);
        }
        return acc;
      },
      { student: [], trainer: [] }
    );
  }, [submissions]);

  const studentSubmissions = submissionGroups.student;
  const trainerFeedback = submissionGroups.trainer;

  const latestSubmissionByAssignment = useMemo(() => {
    const map = new Map<string, StudentSubmission>();
    const getTimestamp = (submission: StudentSubmission) => {
      const source =
        (submission.submitted_at as string | null) ??
        (submission.created_at as string | null);
      if (!source) return 0;
      const date = new Date(source);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };

    const sorted = [...allSubmissions].sort(
      (a, b) => getTimestamp(b) - getTimestamp(a)
    );

    sorted.forEach((submission) => {
      const assignmentId = submission.assignment_id as string;
      if (!map.has(assignmentId)) {
        map.set(assignmentId, submission);
      }
    });

    return map;
  }, [allSubmissions]);

  const latestSubmissionForSelectedAssignment = useMemo(() => {
    if (!selectedAssignmentId) return undefined;
    return latestSubmissionByAssignment.get(selectedAssignmentId);
  }, [latestSubmissionByAssignment, selectedAssignmentId]);

  const createAssignment = useCreateSubjectAssignment();
  const assignmentUrl = useCreateAssignmentSignedUrl();
  const uploadSubmission = useUploadStudentSubmission();
  const submissionUrl = useCreateSubmissionSignedUrl();
  const updateGrade = useUpdateSubmissionGrade();
  const isGradeUpdating = updateGrade.isPending;
  const selectedAssignmentGrade =
    latestSubmissionForSelectedAssignment?.grade ?? null;
  const selectedAssignmentGradeVariant =
    selectedAssignmentGrade === 'S'
      ? 'default'
      : selectedAssignmentGrade === 'NYS'
        ? 'destructive'
        : 'outline';

  const handleGradeChange = async (
    submission: StudentSubmission,
    grade: 'S' | 'NYS'
  ) => {
    if (mode === 'student') {
      return;
    }

    if (!selectedSubjectId) {
      toast.error('Select a subject before updating grades');
      return;
    }

    if (submission.grade === grade) {
      return;
    }

    try {
      await updateGrade.mutateAsync({
        submissionId: submission.id as string,
        studentId,
        subjectId: selectedSubjectId,
        grade,
      });
      toast.success('Grade updated');
    } catch (err) {
      toast.error(
        `Failed to update grade: ${String((err as Error).message || err)}`
      );
    }
  };

  const handleStudentUpload = async (
    assignmentId: string,
    file: File,
    notes?: string
  ) => {
    if (!selectedSubjectId) {
      toast.error('Select a subject before uploading');
      throw new Error('Subject not selected');
    }

    try {
      await uploadSubmission.mutateAsync({
        studentId,
        subjectId: selectedSubjectId,
        enrollmentId: null,
        assignmentId,
        file,
        notes: notes && notes.trim().length > 0 ? notes.trim() : null,
      });
      toast.success('Submission uploaded');
    } catch (err) {
      toast.error(`Upload failed: ${String((err as Error).message || err)}`);
      throw err;
    }
  };

  const handleTrainerUpload = async (
    assignmentId: string,
    file: File,
    notes?: string
  ) => {
    if (!selectedSubjectId) {
      toast.error('Select a subject before uploading feedback');
      throw new Error('Subject not selected');
    }

    const trimmed = notes?.trim() ?? '';
    const feedbackNotes = JSON.stringify({
      type: 'trainer-feedback',
      message: trimmed.length > 0 ? trimmed : null,
    });

    try {
      await uploadSubmission.mutateAsync({
        studentId,
        subjectId: selectedSubjectId,
        enrollmentId: null,
        assignmentId,
        file,
        notes: feedbackNotes,
      });
      toast.success('Feedback uploaded');
    } catch (err) {
      toast.error(`Upload failed: ${String((err as Error).message || err)}`);
      throw err;
    }
  };

  const assignmentTitle = selectedAssignment?.title ?? 'Selected assignment';

  return (
    <div className="flex h-[600px] overflow-hidden rounded-lg border">
      {/* Left Pane - Subjects */}
      <div className="flex w-1/3 flex-col border-r">
        <div className="border-b p-4">
          <div className="font-medium">Subjects</div>
          <div className="text-muted-foreground text-sm">
            Select a subject to view assignments
          </div>
        </div>
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4">
          <div className="space-y-2">
            {enrollmentSubjects.map((s) => {
              const subj = s.subjects;
              if (!subj) return null;
              const sid = s.program_plan_subjects?.subject_id as string;
              const isSelected = sid === selectedSubjectId;
              const outcomeCode = (s.outcome_code ?? null) as
                | 'C'
                | 'NYC'
                | null;
              const outcomeBadgeVariant =
                outcomeCode === 'C'
                  ? 'default'
                  : outcomeCode === 'NYC'
                    ? 'destructive'
                    : 'outline';
              const outcomeBadgeText = outcomeCode ?? '—';
              const outcomeDescription =
                outcomeCode === 'C'
                  ? 'Competent'
                  : outcomeCode === 'NYC'
                    ? 'Not Yet Competent'
                    : 'Not yet assessed';
              return (
                <div
                  key={`${sid}-${subj.code}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSubjectChange(sid)}
                  onKeyDown={(event) => handleSubjectKeyDown(event, sid)}
                  aria-label={`Select subject ${subj.code}`}
                  aria-pressed={isSelected}
                  className={cn(
                    'focus-visible:ring-ring flex items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50 border-transparent'
                  )}
                >
                  <Badge
                    variant={isSelected ? 'default' : 'outline'}
                    className="mt-0.5 uppercase"
                  >
                    {subj.code}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate text-sm font-medium">
                        {subj.name}
                      </div>
                      <Badge
                        variant={outcomeBadgeVariant}
                        className="shrink-0 uppercase"
                      >
                        {outcomeBadgeText}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      {outcomeDescription}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Middle Pane - Assignments */}
      <div className="flex w-1/3 flex-col border-r">
        <div className="border-b p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">
                {selectedSubject?.subjects?.name ?? 'Select a subject'}
              </div>
              <div className="text-muted-foreground text-sm">
                {assignments.length} assignments
              </div>
            </div>
            {mode === 'staff' && selectedSubjectId && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" aria-label="Add assignment">
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </DialogTrigger>
                <CreateAssignmentDialog
                  subjectId={selectedSubjectId}
                  onCreate={async (payload) => {
                    try {
                      await createAssignment.mutateAsync(payload);
                      toast.success('Assignment created');
                    } catch (e) {
                      toast.error(
                        `Failed: ${String((e as Error).message || e)}`
                      );
                    }
                  }}
                />
              </Dialog>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-3">
            {assignments.length === 0 && (
              <div className="text-muted-foreground text-sm">
                No assignments yet.
              </div>
            )}
            {assignments.map((a) => {
              const assignmentId = a.id as string;
              const assignmentLatestSubmission =
                latestSubmissionByAssignment.get(assignmentId);
              const assignmentGrade = assignmentLatestSubmission?.grade ?? null;
              const gradeBadgeVariant =
                assignmentGrade === 'S'
                  ? 'default'
                  : assignmentGrade === 'NYS'
                    ? 'destructive'
                    : 'outline';

              return (
                <div
                  key={a.id}
                  className={`cursor-pointer rounded-md border p-3 transition-colors ${
                    a.id === selectedAssignmentId
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedAssignmentId(assignmentId)}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{a.title}</div>
                        {a.due_date && (
                          <div className="text-muted-foreground text-xs">
                            Due: {a.due_date as unknown as string}
                          </div>
                        )}
                        {a.description && (
                          <div className="text-muted-foreground mt-1 text-xs">
                            {a.description}
                          </div>
                        )}
                        {assignmentGrade && (
                          <Badge
                            variant={gradeBadgeVariant}
                            className="mt-2 w-fit uppercase"
                          >
                            {assignmentGrade}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const url = await assignmentUrl.mutateAsync({
                              filePath: a.file_path!,
                              expiresIn: 60,
                            });
                            window.open(url, '_blank', 'noopener,noreferrer');
                          } catch (e) {
                            toast.error(
                              `Download failed: ${String(
                                (e as Error).message || e
                              )}`
                            );
                          }
                        }}
                        aria-label={`Download ${a.file_name}`}
                      >
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </div>
                    {a.id === selectedAssignmentId && mode === 'staff' && (
                      <div
                        className="space-y-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Label className="text-muted-foreground text-xs">
                          Assessment outcome
                        </Label>
                        {assignmentLatestSubmission ? (
                          <Select
                            value={
                              assignmentLatestSubmission.grade ?? undefined
                            }
                            onValueChange={(value) =>
                              void handleGradeChange(
                                assignmentLatestSubmission,
                                value as 'S' | 'NYS'
                              )
                            }
                            disabled={isGradeUpdating}
                          >
                            <SelectTrigger
                              className="w-full"
                              disabled={isGradeUpdating}
                            >
                              <SelectValue placeholder="Set outcome" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="S">
                                S - Satisfactory
                              </SelectItem>
                              <SelectItem value="NYS">
                                NYS - Not Yet Satisfactory
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-muted-foreground text-xs">
                            Upload a student submission before grading.
                          </p>
                        )}
                        <p className="text-muted-foreground text-xs">
                          Unit outcomes update automatically once all
                          assessments are marked Satisfactory.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Pane - Submissions */}
      <div className="flex w-1/3 flex-col">
        <div className="border-b p-4">
          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground text-sm font-medium">
              Selected assignment
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {selectedAssignment?.title ?? 'Select an assignment'}
                </div>
                <div className="text-muted-foreground text-sm">
                  {selectedAssignmentId
                    ? `${studentSubmissions.length} student ${
                        studentSubmissions.length === 1
                          ? 'submission'
                          : 'submissions'
                      } · ${trainerFeedback.length} trainer feedback ${
                        trainerFeedback.length === 1 ? 'entry' : 'entries'
                      }`
                    : 'Choose an assignment to manage submissions'}
                </div>
              </div>
              {selectedAssignmentGrade && (
                <Badge
                  variant={selectedAssignmentGradeVariant}
                  className="uppercase"
                >
                  {selectedAssignmentGrade}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedAssignmentId ? (
            <div className="text-muted-foreground text-sm">
              Select an assignment to view submissions
            </div>
          ) : (
            <div className="space-y-6">
              <section aria-label="Student submissions">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-medium">
                      Student submissions ({studentSubmissions.length})
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Latest uploads are shown first
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" aria-label="Upload submission">
                        <UploadCloud className="mr-2 h-4 w-4" /> Upload
                      </Button>
                    </DialogTrigger>
                    <UploadSubmissionDialog
                      assignmentId={selectedAssignmentId}
                      assignmentTitle={assignmentTitle}
                      dialogTitle="Upload submission"
                      submitLabel="Upload"
                      descriptionLabel="Description"
                      descriptionPlaceholder="Add a description for your submission..."
                      onUpload={handleStudentUpload}
                    />
                  </Dialog>
                </div>
                <div className="w-full overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="border-r">File</TableHead>
                        <TableHead className="border-r">Submitted at</TableHead>
                        <TableHead className="border-r">Notes</TableHead>
                        <TableHead className="border-r text-center">
                          Grade
                        </TableHead>
                        <TableHead className="w-32 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentSubmissions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <div className="text-muted-foreground text-sm">
                              No student submissions yet
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {studentSubmissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="border-r">
                            {submission.file_name}
                          </TableCell>
                          <TableCell className="border-r text-sm">
                            {format(
                              new Date(submission.submitted_at as string),
                              'MMM dd, yyyy HH:mm'
                            )}
                          </TableCell>
                          <TableCell className="border-r text-sm">
                            {submission.description ?? '—'}
                          </TableCell>
                          <TableCell className="border-r text-center">
                            {submission.grade ? (
                              <Badge
                                variant={
                                  submission.grade === 'S'
                                    ? 'default'
                                    : 'destructive'
                                }
                                className="uppercase"
                              >
                                {submission.grade}
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const url = await submissionUrl.mutateAsync({
                                    filePath: submission.file_path!,
                                    expiresIn: 60,
                                  });
                                  window.open(
                                    url,
                                    '_blank',
                                    'noopener,noreferrer'
                                  );
                                } catch (e) {
                                  toast.error(
                                    `Download failed: ${String(
                                      (e as Error).message || e
                                    )}`
                                  );
                                }
                              }}
                              aria-label={`Download ${submission.file_name}`}
                            >
                              <Download className="mr-2 h-4 w-4" /> Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              <section aria-label="Trainer feedback">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-medium">
                      Trainer feedback ({trainerFeedback.length})
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Upload annotated files and notes for the student
                    </p>
                  </div>
                  {mode === 'staff' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          aria-label="Upload feedback"
                        >
                          <UploadCloud className="mr-2 h-4 w-4" /> Upload
                          feedback
                        </Button>
                      </DialogTrigger>
                      <UploadSubmissionDialog
                        assignmentId={selectedAssignmentId}
                        assignmentTitle={assignmentTitle}
                        dialogTitle="Upload feedback"
                        submitLabel="Upload feedback"
                        descriptionLabel="Feedback notes"
                        descriptionPlaceholder="Share context for the student (optional)"
                        onUpload={handleTrainerUpload}
                      />
                    </Dialog>
                  )}
                </div>
                <div className="w-full overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="border-r">File</TableHead>
                        <TableHead className="border-r">Uploaded at</TableHead>
                        <TableHead className="border-r">Message</TableHead>
                        <TableHead className="w-32 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trainerFeedback.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <div className="text-muted-foreground text-sm">
                              No feedback uploaded yet
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {trainerFeedback.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="border-r">
                            {submission.file_name}
                          </TableCell>
                          <TableCell className="border-r text-sm">
                            {format(
                              new Date(submission.submitted_at as string),
                              'MMM dd, yyyy HH:mm'
                            )}
                          </TableCell>
                          <TableCell className="border-r text-sm">
                            {submission.description ?? '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const url = await submissionUrl.mutateAsync({
                                    filePath: submission.file_path!,
                                    expiresIn: 60,
                                  });
                                  window.open(
                                    url,
                                    '_blank',
                                    'noopener,noreferrer'
                                  );
                                } catch (e) {
                                  toast.error(
                                    `Download failed: ${String(
                                      (e as Error).message || e
                                    )}`
                                  );
                                }
                              }}
                              aria-label={`Download ${submission.file_name}`}
                            >
                              <Download className="mr-2 h-4 w-4" /> Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const CreateAssignmentDialog = ({
  subjectId,
  onCreate,
}: {
  subjectId: string;
  onCreate: (p: {
    subjectId: string;
    title: string;
    description?: string | null;
    dueDate?: Date | null;
    visibleFrom?: Date | null;
    visibleTo?: Date | null;
    file: File;
  }) => Promise<void>;
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [visibleFrom, setVisibleFrom] = useState('');
  const [visibleTo, setVisibleTo] = useState('');
  const [file, setFile] = useState<File | null>(null);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create assignment</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3 py-2">
        <div className="grid gap-1">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="grid gap-1">
            <Label htmlFor="due">Due date</Label>
            <Input
              id="due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="vfrom">Visible from</Label>
            <Input
              id="vfrom"
              type="datetime-local"
              value={visibleFrom}
              onChange={(e) => setVisibleFrom(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="vto">Visible to</Label>
            <Input
              id="vto"
              type="datetime-local"
              value={visibleTo}
              onChange={(e) => setVisibleTo(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="file">File</Label>
          <Input
            id="file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={async () => {
            if (!file) {
              toast.error('File is required');
              return;
            }
            if (!title.trim()) {
              toast.error('Title is required');
              return;
            }
            await onCreate({
              subjectId,
              title: title.trim(),
              description: description.trim() || null,
              dueDate: dueDate ? new Date(dueDate) : null,
              visibleFrom: visibleFrom ? new Date(visibleFrom) : null,
              visibleTo: visibleTo ? new Date(visibleTo) : null,
              file,
            });
          }}
        >
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

type UploadSubmissionDialogProps = {
  assignmentId: string;
  assignmentTitle: string;
  dialogTitle: string;
  submitLabel: string;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;
  onUpload: (assignmentId: string, file: File, notes?: string) => Promise<void>;
};

const UploadSubmissionDialog = ({
  assignmentId,
  assignmentTitle,
  dialogTitle,
  submitLabel,
  descriptionLabel,
  descriptionPlaceholder,
  onUpload,
}: UploadSubmissionDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{dialogTitle}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3 py-2">
        <div className="grid gap-1">
          <Label>Assignment</Label>
          <div className="text-muted-foreground text-sm font-medium">
            {assignmentTitle}
          </div>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="submission-file">Choose File</Label>
          <Input
            id="submission-file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {descriptionLabel && (
          <div className="grid gap-1">
            <Label htmlFor="submission-notes">{descriptionLabel}</Label>
            <Textarea
              id="submission-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                descriptionPlaceholder ?? 'Add additional information...'
              }
            />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          disabled={!file}
          onClick={async () => {
            if (!file) {
              toast.error('File is required');
              return;
            }
            try {
              await onUpload(assignmentId, file, notes.trim() || undefined);
              setFile(null);
              setNotes('');
            } catch (_err) {
              // Error toasts handled by onUpload; keep dialog open for retry.
            }
          }}
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
