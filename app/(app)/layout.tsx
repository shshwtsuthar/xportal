import * as React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopbar } from '@/components/app-topbar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { QueryProvider } from '@/app/_providers/QueryProvider';
import ComposeEmailProvider from '@/components/providers/compose-email';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ComposeEmailProvider>
      <SidebarProvider>
        <AppSidebar suppressHydrationWarning />
        <SidebarInset>
          <AppTopbar />
          <QueryProvider>
            <div className="flex flex-1 flex-col gap-6">{children}</div>
          </QueryProvider>
        </SidebarInset>
      </SidebarProvider>
    </ComposeEmailProvider>
  );
}
