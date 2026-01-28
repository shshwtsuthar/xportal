'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/components/page-container';

export default function FinanceDashboardPage() {
  return (
    <PageContainer
      title="Finance"
      description="KPIs and daily workflow overview"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Due This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">—</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-semibold">—</div>
              <Badge variant="destructive">Overdue</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Collected MTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">—</div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
