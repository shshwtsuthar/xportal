'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetApplicationsWithDeposits } from '@/src/hooks/useGetApplicationsWithDeposits';
import { DepositsDataTable } from './_components/DepositsDataTable';
import { FileText } from 'lucide-react';

export default function DepositsPage() {
  const { data, isLoading, isError } = useGetApplicationsWithDeposits();

  const totalApplicants = data?.length ?? 0;
  const unpaidCount =
    data?.filter((app) => (app.deposit_summary?.unpaid_count ?? 0) > 0)
      .length ?? 0;

  return (
    <div className="mx-auto w-full max-w-full p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Deposits</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage deposit payments for applicants before approval
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Applicants
            </CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplicants}</div>
            <p className="text-muted-foreground text-xs">
              With deposit requirements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
            <FileText className="text-destructive h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unpaidCount}</div>
            <p className="text-muted-foreground text-xs">
              Applicants with unpaid deposits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fully Paid</CardTitle>
            <FileText className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalApplicants - unpaidCount}
            </div>
            <p className="text-muted-foreground text-xs">
              Ready for acceptance
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Applicants with Deposits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DepositsDataTable
            data={data ?? []}
            isLoading={isLoading}
            isError={isError}
          />
        </CardContent>
      </Card>
    </div>
  );
}
