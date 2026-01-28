'use client';

import { useMemo } from 'react';
import { StatCard } from '@/components/ui/stat-card';
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
      <StatCard
        title="Total Applications"
        value={String(stats.totalApplications)}
        icon={FileText}
      />
      <StatCard
        title="Created Today"
        value={String(stats.applicationsToday)}
        icon={Calendar}
      />
      <StatCard
        title="This Week"
        value={String(stats.applicationsThisWeek)}
        icon={TrendingUp}
      />
      <StatCard
        title="Approved"
        value={String(stats.approvedApplications)}
        icon={CheckCircle2}
      />
    </div>
  );
}
