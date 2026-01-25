import type { Metadata } from 'next';
import { GeistSans, GeistMono } from 'geist/font';
import './globals.css';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { QueryProvider } from './_providers/QueryProvider';
import { AuthErrorHandler } from './_providers/AuthErrorHandler';
import { ThemeInitializer } from './_providers/ThemeInitializer';
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';

export const metadata: Metadata = {
  title: 'XPortal - RTO Management System',
  description: 'A comprehensive student management system for RTOs',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  // Check if user is logged in
  await supabase.auth.getSession();

  // Get the current path from headers
  await headers();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="monochrome"
          themes={[
            // Light Themes
            'red-light',
            'green-light',
            'blue-light',
            'purple-light',
            'orange-light',
            'pink-light',
            'teal-light',
            'indigo-light',
            'amber-light',
            'emerald-light',
            'cyan-light',
            'rose-light',
            'violet-light',
            'lime-light',
            'sky-light',
            'fuchsia-light',
            'slate-light',
            'zinc-light',
            'neutral-light',
            'stone-light',
            // Dark Themes
            'red-dark',
            'green-dark',
            'blue-dark',
            'purple-dark',
            'orange-dark',
            'pink-dark',
            'teal-dark',
            'indigo-dark',
            'amber-dark',
            'emerald-dark',
            'cyan-dark',
            'rose-dark',
            'violet-dark',
            'lime-dark',
            'sky-dark',
            'fuchsia-dark',
            'slate-dark',
            'zinc-dark',
            'neutral-dark',
            'stone-dark',
            // Special Themes
            'midnight',
            'sunset',
            'ocean',
            'forest',
            'desert',
            'aurora',
            'cosmic',
            'minimal',
            'high-contrast',
            'warm',
            'cool',
            'monochrome',
          ]}
          enableSystem={false}
        >
          <AuthErrorHandler>
            <QueryProvider>
              <ThemeInitializer />
              {children}
            </QueryProvider>
          </AuthErrorHandler>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
