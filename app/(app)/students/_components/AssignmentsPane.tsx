'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Plus, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
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

  const selectedSubject = useMemo(() => {
    return enrollmentSubjects.find(
      (s) => s.program_plan_subjects?.subject_id === selectedSubjectId
    );
  }, [enrollmentSubjects, selectedSubjectId]);

  const { data: assignments = [] } = useGetSubjectAssignments({
    subjectId: selectedSubjectId,
  });
  const { data: submissions = [] } = useGetStudentSubmissions({
    studentId,
    subjectId: selectedSubjectId,
  });

  const createAssignment = useCreateSubjectAssignment();
  const assignmentUrl = useCreateAssignmentSignedUrl();
  const uploadSubmission = useUploadStudentSubmission();
  const submissionUrl = useCreateSubmissionSignedUrl();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Left: Subjects */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between">
              <div>
                <div>Subjects</div>
                <div className="text-muted-foreground text-xs">
                  Select a subject to view assignments
                </div>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {enrollmentSubjects.map((s) => {
              const subj = s.subjects;
              if (!subj) return null;
              const sid = s.program_plan_subjects?.subject_id as string;
              return (
                <Button
                  key={`${sid}-${subj.code}`}
                  variant={sid === selectedSubjectId ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSubjectId(sid)}
                  className="justify-start"
                  aria-label={`Select subject ${subj.code}`}
                >
                  <span className="mr-2 font-mono text-xs">{subj.code}</span>
                  <span className="truncate">{subj.name}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Middle: Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div>
                  {selectedSubject?.subjects?.name ?? 'Select a subject'}
                </div>
                <div className="text-muted-foreground text-xs">
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {assignments.length === 0 && (
              <div className="text-muted-foreground text-sm">
                No assignments yet.
              </div>
            )}
            {assignments.map((a) => (
              <div key={a.id} className="rounded-md border p-3">
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
                    onClick={async () => {
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
        </CardContent>
      </Card>

      {/* Right: Student submissions */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div>Student&apos;s submissions</div>
                <div className="text-muted-foreground text-xs">
                  {submissions.length} submissions made
                </div>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Upload panel */}
          <UploadSubmissionForm
            disabled={!selectedSubjectId || assignments.length === 0}
            assignments={assignments.map((a) => ({
              id: a.id as string,
              title: a.title as string,
            }))}
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

          {/* List submissions */}
          <div className="mt-4 w-full overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Submitted at</TableHead>
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
                    <TableCell>
                      {/* We do not join in hook; show filename */}
                      {s.file_name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.submitted_at as unknown as string}
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
        </CardContent>
      </Card>
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

function UploadSubmissionForm({
  disabled,
  assignments,
  onUpload,
}: {
  disabled: boolean;
  assignments: { id: string; title: string }[];
  onUpload: (assignmentId: string, file: File, notes?: string) => Promise<void>;
}) {
  const [assignmentId, setAssignmentId] = useState<string | undefined>(
    assignments[0]?.id
  );
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  return (
    <div className="rounded-md border p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <div className="md:col-span-2">
          <Label>Assignment</Label>
          <Select
            value={assignmentId}
            onValueChange={(v) => setAssignmentId(v)}
          >
            <SelectTrigger aria-label="Select assignment">
              <SelectValue placeholder="Select assignment" />
            </SelectTrigger>
            <SelectContent>
              {assignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="submission-file">File</Label>
          <Input
            id="submission-file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="flex items-end md:col-span-1">
          <Button
            disabled={disabled || !assignmentId || !file}
            onClick={async () => {
              if (!assignmentId || !file) return;
              await onUpload(assignmentId, file, notes.trim() || undefined);
              setFile(null);
            }}
            aria-label="Upload submission"
          >
            <UploadCloud className="mr-2 h-4 w-4" /> Upload
          </Button>
        </div>
        <div className="md:col-span-5">
          <Label htmlFor="submission-notes">Notes</Label>
          <Textarea
            id="submission-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
