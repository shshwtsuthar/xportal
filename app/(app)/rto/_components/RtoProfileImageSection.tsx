'use client';

import { useCallback, useMemo } from 'react';
import type { KeyboardEvent } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDeleteRtoProfileImage,
  useRtoProfileImageUrl,
  useUploadRtoProfileImage,
} from '@/src/hooks/useRtoProfileImage';

type Props = {
  profileImagePath?: string | null;
};

const ACCEPTED_IMAGE_TYPES = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
};

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export function RtoProfileImageSection({ profileImagePath }: Props) {
  const { data: imageUrl, isLoading: isLoadingImage } =
    useRtoProfileImageUrl(profileImagePath);
  const uploadMutation = useUploadRtoProfileImage();
  const deleteMutation = useDeleteRtoProfileImage();

  const isBusy = uploadMutation.isPending || deleteMutation.isPending;

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file) return;
      if (file.size > MAX_FILE_BYTES) {
        toast.error('Image size must be 5MB or less.');
        return;
      }

      try {
        await uploadMutation.mutateAsync({
          file,
          currentPath: profileImagePath,
        });
        toast.success('Profile image updated.');
      } catch (error) {
        toast.error(
          `Failed to upload profile image: ${String((error as Error).message || error)}`
        );
      }
    },
    [profileImagePath, uploadMutation]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;
      if (!file) return;
      await handleUpload(file);
    },
    [handleUpload]
  );

  const onDropRejected = useCallback(() => {
    toast.error(
      'Unsupported file. Please upload a PNG, JPG, GIF, SVG, or WebP under 5MB.'
    );
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_FILE_BYTES,
    multiple: false,
    disabled: isBusy,
    noKeyboard: true,
  });

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    },
    [open]
  );

  const preview = useMemo(() => {
    if (isLoadingImage) {
      return <Skeleton className="size-20 rounded-full" />;
    }

    if (imageUrl) {
      return (
        <Avatar className="size-20">
          <AvatarImage src={imageUrl} alt="RTO profile image" />
          <AvatarFallback>RTO</AvatarFallback>
        </Avatar>
      );
    }

    return (
      <Avatar className="size-20">
        <AvatarFallback>RTO</AvatarFallback>
      </Avatar>
    );
  }, [imageUrl, isLoadingImage]);

  const handleRemove = useCallback(async () => {
    if (!profileImagePath) return;
    try {
      await deleteMutation.mutateAsync({ currentPath: profileImagePath });
      toast.success('Profile image removed.');
    } catch (error) {
      toast.error(
        `Failed to remove profile image: ${String((error as Error).message || error)}`
      );
    }
  }, [deleteMutation, profileImagePath]);

  return (
    <section className="bg-muted/40 rounded-lg border p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {preview}
          <div className="space-y-1">
            <h2 className="text-base font-semibold">RTO Profile Image</h2>
            <p className="text-muted-foreground text-sm">
              Upload a square logo or profile image. It appears in the sidebar
              next to XPortal.
            </p>
          </div>
        </div>
        {profileImagePath ? (
          <Button
            variant="ghost"
            onClick={handleRemove}
            disabled={isBusy}
            aria-label="Remove profile image"
          >
            <X className="mr-2 h-4 w-4" /> Remove image
          </Button>
        ) : null}
      </div>

      <div
        {...getRootProps({
          className: `mt-4 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isDragActive
              ? 'border-primary bg-primary/10'
              : 'border-border hover:bg-muted'
          } ${isBusy ? 'pointer-events-none opacity-60' : ''}`,
          tabIndex: 0,
          role: 'button',
          'aria-label': 'Upload RTO profile image dropzone',
          'aria-busy': isBusy,
          onKeyDown: handleKeyDown,
        })}
      >
        <input
          {...getInputProps({
            'aria-label': 'Select RTO profile image file',
            accept: Object.values(ACCEPTED_IMAGE_TYPES).flat().join(','),
          })}
        />
        <UploadCloud className="mb-2 h-6 w-6" aria-hidden="true" />
        <p className="text-sm font-medium">
          {isBusy
            ? 'Processing image...'
            : 'Drag & drop an image here, or click to browse'}
        </p>
        <p className="text-muted-foreground text-xs">
          PNG, JPG, GIF, SVG, or WebP up to 5MB
        </p>
      </div>
    </section>
  );
}
