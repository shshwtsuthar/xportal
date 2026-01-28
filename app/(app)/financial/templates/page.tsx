'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/page-container';
import { Plus } from 'lucide-react';
import { PaymentPlanTemplatesTable } from './_components/PaymentPlanTemplatesTable';

export default function PaymentPlanTemplatesPage() {
  return (
    <PageContainer
      title="Payment Plan Templates"
      description="Create and manage payment plan blueprints for your programs"
      actions={
        <Button asChild>
          <Link href="/financial/templates/new">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Link>
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentPlanTemplatesTable />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
