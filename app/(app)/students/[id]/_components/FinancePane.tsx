'use client';

import { StudentInvoicesTable } from '@/app/(app)/financial/invoices/_components/StudentInvoicesTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FinancePane({ studentId }: { studentId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Finance</CardTitle>
      </CardHeader>
      <CardContent>
        <StudentInvoicesTable studentId={studentId} />
      </CardContent>
    </Card>
  );
}
