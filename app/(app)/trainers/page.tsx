'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainersDataTable } from './_components/TrainersDataTable';
import { InviteTrainerDialog } from './_components/InviteTrainerDialog';

export default function TrainersPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Trainer Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage trainers and their access
          </p>
        </div>
        <InviteTrainerDialog />
      </div>

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
    </div>
  );
}
