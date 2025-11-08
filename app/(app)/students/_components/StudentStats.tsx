'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Calendar, TrendingUp } from 'lucide-react';
import { Tables } from '@/database.types';
import { startOfWeek, isAfter, isSameDay } from 'date-fns';

type Props = {
  students: Tables<'students'>[];
};

export function StudentStats({ students }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday

    const totalStudents = students.length;
    const activeStudents = students.filter(
      (student) => student.status === 'ACTIVE'
    ).length;
    const studentsToday = students.filter(
      (student) =>
        student.created_at && isSameDay(new Date(student.created_at), now)
    ).length;
    const studentsThisWeek = students.filter(
      (student) =>
        student.created_at && isAfter(new Date(student.created_at), weekStart)
    ).length;

    return {
      totalStudents,
      activeStudents,
      studentsToday,
      studentsThisWeek,
    };
  }, [students]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total Students
          </CardTitle>
          <Users className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {stats.totalStudents}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Active Students
          </CardTitle>
          <UserCheck className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {stats.activeStudents}
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
            {stats.studentsToday}
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
            {stats.studentsThisWeek}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
