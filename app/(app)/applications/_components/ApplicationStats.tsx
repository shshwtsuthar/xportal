'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, CheckCircle2, TrendingUp } from 'lucide-react';
import { Tables } from '@/database.types';
import { startOfDay, startOfWeek, isAfter, isSameDay } from 'date-fns';

type ApplicationWithAgent = Tables<'applications'> & {
  agents?: Pick<Tables<'agents'>, 'name'> | null;
};

type Props = {
  applications: ApplicationWithAgent[];
};

export function ApplicationStats({ applications }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday

    const totalApplications = applications.length;
    const applicationsToday = applications.filter(
      (app) => app.created_at && isSameDay(new Date(app.created_at), now)
    ).length;
    const applicationsThisWeek = applications.filter(
      (app) => app.created_at && isAfter(new Date(app.created_at), weekStart)
    ).length;
    const approvedApplications = applications.filter(
      (app) => app.status === 'APPROVED'
    ).length;

    return {
      totalApplications,
      applicationsToday,
      applicationsThisWeek,
      approvedApplications,
    };
  }, [applications]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total Applications
          </CardTitle>
          <FileText className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {stats.totalApplications}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Created Today
          </CardTitle>
          <Calendar className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {stats.applicationsToday}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            This Week
          </CardTitle>
          <TrendingUp className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {stats.applicationsThisWeek}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Approved
          </CardTitle>
          <CheckCircle2 className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {stats.approvedApplications}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
