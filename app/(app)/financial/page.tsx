'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function FinanceDashboardPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
        <p className="text-muted-foreground text-sm">
          KPIs and daily workflow overview
        </p>
      </div>

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
    </div>
  );
}
