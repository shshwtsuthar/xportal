'use client';

import * as React from 'react';
import ComposeEmailProvider from '@/components/providers/compose-email';

export default function StudentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ComposeEmailProvider>{children}</ComposeEmailProvider>;
}
