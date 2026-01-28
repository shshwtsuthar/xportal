'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/page-container';

export default function PaymentsPage() {
  return (
    <PageContainer
      title="Payments"
      description="Recent payments and reconciliation"
    >
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Coming soon.</p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
