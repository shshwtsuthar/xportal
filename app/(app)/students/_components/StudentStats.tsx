'use client';

import { StatCard } from '@/components/ui/stat-card';
import { Users, UserCheck, Calendar, TrendingUp } from 'lucide-react';
import type { StudentStats as StudentStatsType } from '@/src/hooks/useGetStudentStats';

type Props = {
  stats: StudentStatsType;
};

export function StudentStats({ stats }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Students"
        value={String(stats.totalStudents)}
        icon={Users}
      />
      <StatCard
        title="Active Students"
        value={String(stats.activeStudents)}
        icon={UserCheck}
      />
      <StatCard
        title="Created Today"
        value={String(stats.studentsToday)}
        icon={Calendar}
      />
      <StatCard
        title="This Week"
        value={String(stats.studentsThisWeek)}
        icon={TrendingUp}
      />
    </div>
  );
}
