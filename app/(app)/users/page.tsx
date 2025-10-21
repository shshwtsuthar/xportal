'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { UsersDataTable } from './_components/UsersDataTable';
import { InviteUserDialog } from './_components/InviteUserDialog';

export default function UsersPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            User Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage staff members and their access
          </p>
        </div>
        <InviteUserDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsersDataTable />
        </CardContent>
      </Card>
    </div>
  );
}
