'use client';

import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { UploadCloud } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetCurrentUser } from '@/src/hooks/useGetCurrentUser';
import {
  useDeleteProfileImage,
  useProfileImageUrl,
  useUploadProfileImage,
} from '@/src/hooks/useProfileImage';
import { useUpdateProfile } from '@/src/hooks/useUpdateProfile';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ACCEPTED_IMAGE_TYPES = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
};

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export function ProfileDialog({ open, onOpenChange }: Props) {
  const { data: user, isLoading: isLoadingUser } = useGetCurrentUser();
  const { data: imageUrl, isLoading: isLoadingImage } = useProfileImageUrl(
    user?.profile_image_path
  );
  const uploadMutation = useUploadProfileImage();
  const deleteMutation = useDeleteProfileImage();
  const updateProfileMutation = useUpdateProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Initialize form fields when user data loads
  useMemo(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
    }
  }, [user]);

  const isBusy =
    uploadMutation.isPending ||
    deleteMutation.isPending ||
    updateProfileMutation.isPending;

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
          currentPath: user?.profile_image_path,
        });
        toast.success('Profile image updated.');
      } catch (error) {
        toast.error(
          `Failed to upload profile image: ${String((error as Error).message || error)}`
        );
      }
    },
    [user?.profile_image_path, uploadMutation]
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

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    open: openFileDialog,
  } = useDropzone({
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
        openFileDialog();
      }
    },
    [openFileDialog]
  );

  const preview = (
    <UserAvatar
      src={imageUrl ?? undefined}
      alt="Profile image"
      firstName={user?.first_name ?? undefined}
      lastName={user?.last_name ?? undefined}
      email={user?.email}
      size="xl"
      isLoading={isLoadingImage ?? isLoadingUser}
    />
  );

  const handleSave = async () => {
    if (!user) return;

    try {
      await updateProfileMutation.mutateAsync({
        first_name: firstName || null,
        last_name: lastName || null,
      });
      toast.success('Profile updated successfully.');
      onOpenChange(false);
    } catch (error) {
      toast.error(
        `Failed to update profile: ${String((error as Error).message || error)}`
      );
    }
  };

  const handleCancel = () => {
    // Reset form fields to original values
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
    }
    onOpenChange(false);
  };

  if (isLoadingUser) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              Profile
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Photo Section */}
          <div className="bg-muted/40 rounded-lg border p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                {preview}
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">Profile Photo</h3>
                  <p className="text-muted-foreground text-sm">
                    Upload a profile image. It appears in your account switcher.
                  </p>
                </div>
              </div>
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
                'aria-label': 'Upload profile image dropzone',
                'aria-busy': isBusy,
                onKeyDown: handleKeyDown,
              })}
            >
              <input
                {...getInputProps({
                  'aria-label': 'Select profile image file',
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
          </div>

          {/* Form Fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                disabled={isBusy}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                disabled={isBusy}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="bg-muted"
              aria-label="Email address (read-only)"
            />
            <p className="text-muted-foreground text-xs">
              Email cannot be changed from this dialog.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isBusy}>
              {isBusy ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
