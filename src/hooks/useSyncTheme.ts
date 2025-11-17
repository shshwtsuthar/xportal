'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { useGetCurrentUser } from './useGetCurrentUser';
import { useUpdateProfile } from './useUpdateProfile';
import { toast } from 'sonner';

const DEFAULT_THEME = 'monochrome';

/**
 * Hook to sync theme preference between database and next-themes.
 * For authenticated users: syncs with database, falls back to default if no preference.
 * For unauthenticated users: uses localStorage only (handled by next-themes).
 * @returns Mutation function to save theme to database
 */
export const useSyncTheme = () => {
  const { theme, setTheme } = useTheme();
  const { data: user, isLoading: isLoadingUser } = useGetCurrentUser();
  const updateProfileMutation = useUpdateProfile();
  const lastUserId = useRef<string | null>(null);
  const hasInitializedForUser = useRef(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure we're mounted before initializing theme (prevents hydration mismatch)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize theme from database when user data loads (for authenticated users)
  useEffect(() => {
    // Wait for mount and user data to be ready
    if (!isMounted || isLoadingUser) return;

    const currentUserId = user?.id || null;

    // Only initialize if user changed (login/logout)
    if (currentUserId !== lastUserId.current) {
      lastUserId.current = currentUserId;
      hasInitializedForUser.current = false;
    }

    // Only sync from DB if user is authenticated and we haven't initialized for this user yet
    if (user && !hasInitializedForUser.current) {
      hasInitializedForUser.current = true;
      const dbTheme = user.theme;
      const targetTheme = dbTheme || DEFAULT_THEME;

      // Only set theme if it's different from current to avoid unnecessary updates
      // Use setTimeout to ensure this runs after hydration is complete
      if (theme !== targetTheme) {
        setTimeout(() => {
          setTheme(targetTheme);
        }, 0);
      }
    }
    // For unauthenticated users, next-themes handles localStorage automatically
  }, [isMounted, user, isLoadingUser, theme, setTheme]);

  /**
   * Save theme to database (for authenticated users only).
   * For unauthenticated users, next-themes handles localStorage automatically.
   * @param themeValue - The theme value to save
   */
  const saveThemeToDb = async (themeValue: string) => {
    if (!user) {
      // Unauthenticated: next-themes handles localStorage, just update the UI
      setTheme(themeValue);
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        theme: themeValue,
      });
      // Theme is already set via setTheme in the component, so UI updates immediately
    } catch (error) {
      toast.error(
        `Failed to save theme preference: ${String((error as Error).message || error)}`
      );
      throw error;
    }
  };

  return {
    saveThemeToDb,
    isLoading: isLoadingUser,
    isAuthenticated: !!user,
  };
};
