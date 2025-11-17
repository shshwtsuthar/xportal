'use client';

import { useSyncTheme } from '@/src/hooks/useSyncTheme';

/**
 * Client component that initializes theme from database on app load.
 * This component runs the useSyncTheme hook which handles:
 * - Fetching theme from database for authenticated users
 * - Initializing next-themes with the DB value or default
 * - Falling back to localStorage for unauthenticated users
 */
export function ThemeInitializer() {
  useSyncTheme();
  return null;
}
