'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const AVATAR_SIZES = {
  xs: 'size-6',
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
  xl: 'size-20',
  '2xl': 'size-24',
} as const;

type UserAvatarSize = keyof typeof AVATAR_SIZES;

const USER_AVATAR_VARIANTS = {
  default: {
    root: '',
    fallback: '',
    rounded: 'rounded-full',
  },
  bordered: {
    root: 'border border-border rounded-lg',
    fallback: '',
    rounded: 'rounded-lg',
  },
  sidebar: {
    root: 'border border-border rounded-lg',
    fallback: 'bg-sidebar-primary text-sidebar-primary-foreground',
    rounded: 'rounded-lg',
  },
} as const;

type UserAvatarVariant = keyof typeof USER_AVATAR_VARIANTS;

type GetInitialsOptions = {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

function getInitials(options: GetInitialsOptions): string {
  const { name, firstName, lastName, email } = options;

  if (firstName !== undefined || lastName !== undefined) {
    const first = (firstName ?? '')[0]?.toUpperCase() ?? '';
    const last = (lastName ?? '')[0]?.toUpperCase() ?? '';
    const combined = (first + last).trim();
    if (combined) return combined;
    const fromEmail = (email ?? '')[0]?.toUpperCase();
    return fromEmail || 'U';
  }

  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0]?.toUpperCase() ?? '';
    const last =
      parts.length > 1
        ? (parts[parts.length - 1]?.[0]?.toUpperCase() ?? '')
        : '';
    const combined = (first + last).trim();
    if (combined) return combined;
    const fromEmail = (email ?? '')[0]?.toUpperCase();
    return fromEmail || 'U';
  }

  if (email?.trim()) {
    return email[0]?.toUpperCase() || 'U';
  }

  return 'U';
}

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        'relative flex size-8 shrink-0 overflow-hidden rounded-full',
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full', className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'bg-muted flex size-full items-center justify-center rounded-full',
        className
      )}
      {...props}
    />
  );
}

type UserAvatarProps = {
  src?: string;
  alt?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  fallback?: React.ReactNode;
  size?: UserAvatarSize;
  variant?: UserAvatarVariant;
  isLoading?: boolean;
  className?: string;
};

function UserAvatar({
  src,
  alt,
  name,
  firstName,
  lastName,
  email,
  fallback,
  size = 'sm',
  variant = 'default',
  isLoading = false,
  className,
}: UserAvatarProps) {
  const sizeClass = AVATAR_SIZES[size];
  const variantStyles = USER_AVATAR_VARIANTS[variant];
  const roundedClass = variantStyles.rounded;

  if (isLoading) {
    return (
      <Skeleton
        className={cn(sizeClass, roundedClass, className)}
        aria-hidden
      />
    );
  }

  const fallbackContent =
    fallback ?? getInitials({ name, firstName, lastName, email });

  return (
    <Avatar
      className={cn(sizeClass, variantStyles.root, roundedClass, className)}
    >
      {src ? <AvatarImage src={src} alt={alt ?? 'Avatar'} /> : null}
      <AvatarFallback className={variantStyles.fallback || undefined}>
        {fallbackContent}
      </AvatarFallback>
    </Avatar>
  );
}

export { Avatar, AvatarImage, AvatarFallback, UserAvatar, getInitials };
