'use client';

import { useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useCreateSignedUrl,
  useDeleteAgentFile,
  useListAgentFiles,
  useUploadAgentFile,
} from '@/src/hooks/useAgentFiles';
import { toast } from 'sonner';
import { Download, Trash2, UploadCloud } from 'lucide-react';

type Props = { agentId?: string };

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export function DocumentsPane({ agentId }: Props) {
  const { data: files = [], isLoading, isError } = useListAgentFiles(agentId);
  const uploadMutation = useUploadAgentFile();
  const deleteMutation = useDeleteAgentFile();
  const signedUrlMutation = useCreateSignedUrl();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!agentId) {
        toast.error('Save draft to enable uploads.');
        return;
      }

      for (const file of acceptedFiles) {
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`${file.name} is larger than 10MB.`);
          continue;
        }
        try {
          await uploadMutation.mutateAsync({ agentId, file });
          toast.success(`Uploaded ${file.name}`);
        } catch (e) {
          toast.error(`Upload failed: ${String((e as Error).message || e)}`);
        }
      }
    },
    [agentId, uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
  });

  const isDisabled = useMemo(() => !agentId, [agentId]);

  const handleDownload = async (name: string) => {
    try {
      const url = await signedUrlMutation.mutateAsync({
        agentId: agentId!,
        fileName: name,
        expiresIn: 60,
      });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(
        `Failed to generate download link: ${String((e as Error).message || e)}`
      );
    }
  };

  const handleDelete = async (name: string) => {
    if (!agentId) return;
    try {
      await deleteMutation.mutateAsync({ agentId, fileName: name });
      toast.success('File deleted');
    } catch (e) {
      toast.error(`Delete failed: ${String((e as Error).message || e)}`);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps({
          className:
            'flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-8 min-h-[24rem] text-center outline-none transition-colors ' +
            (isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:bg-muted/40'),
          tabIndex: 0,
          role: 'button',
          'aria-label': 'Upload files dropzone',
        })}
      >
        <input
          {...getInputProps()}
          disabled={isDisabled}
          aria-label="File input"
        />
        <UploadCloud className="mb-2 h-6 w-6" />
        <p className="text-sm font-medium">
          {isDisabled
            ? 'Save draft to enable uploads'
            : 'Drag & drop files here, or click to select'}
        </p>
        <p className="text-muted-foreground text-xs">
          PDF, Images, DOCX up to 10MB each
        </p>
      </div>

      {isLoading && (
        <p className="text-muted-foreground py-6 text-sm">Loading files…</p>
      )}
      {isError && (
        <p className="text-destructive py-6 text-sm">Failed to load files.</p>
      )}

      {!isLoading && !isError && (
        <div className="w-full overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="divide-x">
                <TableHead>File name</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {files.length === 0 && (
                <TableRow className="divide-x">
                  <TableCell colSpan={2}>
                    <p className="text-muted-foreground text-sm">
                      No files uploaded yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {files.map((f) => (
                <TableRow key={f.name} className="divide-x">
                  <TableCell>{f.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(f.name)}
                        aria-label={`Download ${f.name}`}
                      >
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            aria-label={`Delete ${f.name}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete file</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {f.name}? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(f.name)}
                              className="bg-destructive hover:bg-destructive/90 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
