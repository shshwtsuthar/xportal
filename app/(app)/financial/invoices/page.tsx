'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentInvoicesTable } from './_components/StudentInvoicesTable';

export default function InvoicesPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground text-sm">
          View and manage student invoices and payments
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StudentInvoicesTable />
        </CardContent>
      </Card>
    </div>
  );
}
