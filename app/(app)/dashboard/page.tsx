import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CumulativeMetricsChart } from './_components/CumulativeMetricsChart';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    redirect('/login');
  }

  // Use verified user from Auth server
  const { data: userRes } = await supabase.auth.getUser();
  const role = (
    userRes.user?.app_metadata as Record<string, unknown> | undefined
  )?.role;

  const [
    { count: studentCount, error: studentError },
    { count: applicationCount, error: applicationError },
    { count: overdueInvoiceCount, error: overdueInvoicesError },
    { count: paidInvoiceCount, error: paidInvoicesError },
  ] = await Promise.all([
    supabase.from('students').select('id', { head: true, count: 'exact' }),
    supabase.from('applications').select('id', { head: true, count: 'exact' }),
    supabase
      .from('invoices')
      .select('id', { head: true, count: 'exact' })
      .eq('status', 'OVERDUE'),
    supabase
      .from('invoices')
      .select('id', { head: true, count: 'exact' })
      .eq('status', 'PAID'),
  ]);

  if (
    studentError ||
    applicationError ||
    overdueInvoicesError ||
    paidInvoicesError
  ) {
    throw new Error('Failed to load dashboard metrics.');
  }

  const metrics = [
    {
      title: 'Total Students',
      description: 'Active student records',
      value: studentCount ?? 0,
    },
    {
      title: 'Total Applications',
      description: 'All application records',
      value: applicationCount ?? 0,
    },
    {
      title: 'Overdue Invoices',
      description: 'Invoices past due date',
      value: overdueInvoiceCount ?? 0,
    },
    {
      title: 'Paid Invoices',
      description: 'Invoices fully settled',
      value: paidInvoiceCount ?? 0,
    },
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to your Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back! You are logged in as {String(role)}.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader>
              <CardTitle>{metric.title}</CardTitle>
              <CardDescription>{metric.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">
                {metric.value.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-8">
        <CumulativeMetricsChart />
      </section>
    </div>
  );
}
