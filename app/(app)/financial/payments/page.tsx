'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-muted-foreground text-sm">
          Recent payments and reconciliation
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
