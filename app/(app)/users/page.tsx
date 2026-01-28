'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/page-container';
import { UsersDataTable } from './_components/UsersDataTable';
import { InviteUserDialog } from './_components/InviteUserDialog';

export default function UsersPage() {
  return (
    <PageContainer
      title="User Management"
      description="Manage staff members and their access"
      actions={<InviteUserDialog />}
    >
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
    </PageContainer>
  );
}
