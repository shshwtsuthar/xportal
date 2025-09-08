'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle,
  AlertCircle
} from 'lucide-react';
import type { ApplicationStats } from '@/hooks/use-applications-status';

interface ApplicationsStatsProps {
  stats?: ApplicationStats;
  isLoading: boolean;
  isError: boolean;
}

export function ApplicationsStats({ stats, isLoading, isError }: ApplicationsStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">--</div>
            <p className="text-xs text-destructive">Failed to load stats</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Applications',
      value: stats.totalApplications,
      icon: <FileText className="h-4 w-4" />,
      color: 'text-primary',
      bgColor: 'bg-muted',
      description: 'All applications',
    },
    {
      title: 'Drafts',
      value: stats.draftCount,
      icon: <Clock className="h-4 w-4" />,
      color: 'text-foreground',
      bgColor: 'bg-muted',
      description: 'Incomplete applications',
    },
    {
      title: 'Submitted',
      value: stats.submittedCount,
      icon: <Users className="h-4 w-4" />,
      color: 'text-primary',
      bgColor: 'bg-muted',
      description: 'Awaiting review',
    },
    {
      title: 'Approved',
      value: stats.approvedCount,
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-foreground',
      bgColor: 'bg-muted',
      description: 'Successfully processed',
    },
  ];

  // Removed additional metric cards (recent submissions, completion rate, avg processing time)

  return (
    <div className="space-y-6 mb-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <div className={stat.color}>
                  {stat.icon}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary metric cards removed as requested */}

      {/* Rejected Applications (if any) */}
      {stats.rejectedCount > 0 && (
        <Card className="bg-muted">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Rejected Applications</p>
                  <p className="text-2xl font-bold text-destructive">{stats.rejectedCount}</p>
                  <p className="text-xs text-destructive">Require attention</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
