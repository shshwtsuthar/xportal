import type { Metadata } from 'next';
import { GeistSans, GeistMono } from 'geist/font';
import './globals.css';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { QueryProvider } from './_providers/QueryProvider';
import { Toaster } from 'sonner';

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
    <html lang="en">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
