'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/page-container';
import { TrainersDataTable } from './_components/TrainersDataTable';
import { InviteTrainerDialog } from './_components/InviteTrainerDialog';

export default function TrainersPage() {
  return (
    <PageContainer
      title="Trainer Management"
      description="Manage trainers and their access"
      actions={<InviteTrainerDialog />}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Trainers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrainersDataTable />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
