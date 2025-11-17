'use client';

import { useEffect, useRef } from 'react';
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

  // Initialize theme from database when user data loads (for authenticated users)
  useEffect(() => {
    if (isLoadingUser) return;

    const currentUserId = user?.id || null;

    // Only initialize if user changed (login/logout) or if we haven't initialized yet
    if (currentUserId !== lastUserId.current) {
      lastUserId.current = currentUserId;

      // Only sync from DB if user is authenticated
      if (user) {
        const dbTheme = user.theme;

        // If user has a theme in DB, apply it
        if (dbTheme) {
          setTheme(dbTheme);
        } else {
          // If no theme in DB, use default (monochrome)
          setTheme(DEFAULT_THEME);
        }
      }
      // For unauthenticated users, next-themes handles localStorage automatically
    }
  }, [user, isLoadingUser, setTheme]);

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
