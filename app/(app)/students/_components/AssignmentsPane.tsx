'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
} from '@/src/hooks/useStudentSubmissions';

type Props = { studentId: string };

export function AssignmentsPane({ studentId }: Props) {
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

  const createAssignment = useCreateSubjectAssignment();
  const assignmentUrl = useCreateAssignmentSignedUrl();
  const uploadSubmission = useUploadStudentSubmission();
  const submissionUrl = useCreateSubmissionSignedUrl();

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
              return (
                <Button
                  key={`${sid}-${subj.code}`}
                  variant={sid === selectedSubjectId ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleSubjectChange(sid)}
                  className="h-auto w-full justify-start px-3 py-2"
                  aria-label={`Select subject ${subj.code}`}
                >
                  <span className="mr-2 text-sm whitespace-nowrap">
                    {subj.code}
                  </span>
                  <span className="truncate text-sm">{subj.name}</span>
                </Button>
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
            {selectedSubjectId && (
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
            {assignments.map((a) => (
              <div
                key={a.id}
                className={`cursor-pointer rounded-md border p-3 transition-colors ${
                  a.id === selectedAssignmentId
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedAssignmentId(a.id as string)}
              >
                <div className="flex items-center justify-between">
                  <div>
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
                          `Download failed: ${String((e as Error).message || e)}`
                        );
                      }
                    }}
                    aria-label={`Download ${a.file_name}`}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Pane - Submissions */}
      <div className="flex w-1/3 flex-col">
        <div className="border-b p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-medium">Student&apos;s submissions</div>
              <div className="text-muted-foreground text-sm">
                {selectedAssignmentId
                  ? `${submissions.length} submissions for selected assignment`
                  : 'Select an assignment to view submissions'}
              </div>
            </div>
            {selectedAssignmentId && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" aria-label="Upload submission">
                    <UploadCloud className="mr-2 h-4 w-4" /> Upload
                  </Button>
                </DialogTrigger>
                <UploadSubmissionDialog
                  assignmentId={selectedAssignmentId}
                  assignmentTitle={selectedAssignment?.title as string}
                  onUpload={async (assignmentId, file, notes) => {
                    if (!selectedSubjectId) return;
                    try {
                      await uploadSubmission.mutateAsync({
                        studentId,
                        subjectId: selectedSubjectId,
                        enrollmentId: null,
                        assignmentId,
                        file,
                        notes: notes || null,
                      });
                      toast.success('Submission uploaded');
                    } catch (e) {
                      toast.error(
                        `Upload failed: ${String((e as Error).message || e)}`
                      );
                    }
                  }}
                />
              </Dialog>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedAssignmentId ? (
            <div className="text-muted-foreground text-sm">
              Select an assignment to view submissions
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="border-r">Assignment</TableHead>
                    <TableHead className="border-r">Submitted at</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <div className="text-muted-foreground text-sm">
                          No submissions
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {submissions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="border-r">{s.file_name}</TableCell>
                      <TableCell className="border-r text-sm">
                        {format(
                          new Date(s.submitted_at as string),
                          'MMM dd, yyyy HH:mm'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const url = await submissionUrl.mutateAsync({
                                filePath: s.file_path!,
                                expiresIn: 60,
                              });
                              window.open(url, '_blank', 'noopener,noreferrer');
                            } catch (e) {
                              toast.error(
                                `Download failed: ${String((e as Error).message || e)}`
                              );
                            }
                          }}
                          aria-label={`Download ${s.file_name}`}
                        >
                          <Download className="mr-2 h-4 w-4" /> Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateAssignmentDialog({
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
}) {
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
}

function UploadSubmissionDialog({
  assignmentId,
  assignmentTitle,
  onUpload,
}: {
  assignmentId: string;
  assignmentTitle: string;
  onUpload: (assignmentId: string, file: File, notes?: string) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Upload submission</DialogTitle>
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
        <div className="grid gap-1">
          <Label htmlFor="submission-notes">Description</Label>
          <Textarea
            id="submission-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a description for your submission..."
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={!file}
          onClick={async () => {
            if (!file) {
              toast.error('File is required');
              return;
            }
            await onUpload(assignmentId, file, notes.trim() || undefined);
            setFile(null);
            setNotes('');
          }}
        >
          Upload
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
