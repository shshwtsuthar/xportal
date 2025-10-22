'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Tables } from '@/database.types';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  format,
  isAfter,
  subDays,
  subHours,
  eachDayOfInterval,
  eachHourOfInterval,
  isSameDay,
  isSameHour,
} from 'date-fns';

type ApplicationWithAgent = Tables<'applications'> & {
  agents?: Pick<Tables<'agents'>, 'name'> | null;
};

type Props = {
  applications: ApplicationWithAgent[];
};

type TimePeriod = 'day' | 'week' | 'month';

export function ApplicationsChart({ applications }: Props) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');

  const chartData = useMemo(() => {
    const now = new Date();
    let timePoints: Date[] = [];
    let formatFn: (date: Date) => string;

    switch (timePeriod) {
      case 'day':
        timePoints = eachHourOfInterval({
          start: subHours(now, 23),
          end: now,
        });
        formatFn = (date) => format(date, 'h a');
        break;
      case 'week':
        timePoints = eachDayOfInterval({
          start: subDays(now, 6),
          end: now,
        });
        formatFn = (date) => format(date, 'EEE');
        break;
      case 'month':
        timePoints = eachDayOfInterval({
          start: subDays(now, 29),
          end: now,
        });
        formatFn = (date) => format(date, 'MMM d');
        break;
    }

    // Sort applications by created_at for cumulative calculation
    const sortedApplications = applications
      .filter((app) => app.created_at)
      .sort(
        (a, b) =>
          new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()
      );

    return timePoints.map((timePoint) => {
      let count = 0;

      // Count applications created up to this time point
      for (const app of sortedApplications) {
        const appDate = new Date(app.created_at!);

        let isBeforeTimePoint = false;
        switch (timePeriod) {
          case 'day':
            isBeforeTimePoint =
              isSameHour(appDate, timePoint) || appDate < timePoint;
            break;
          case 'week':
            isBeforeTimePoint =
              isSameDay(appDate, timePoint) || appDate < timePoint;
            break;
          case 'month':
            isBeforeTimePoint =
              isSameDay(appDate, timePoint) || appDate < timePoint;
            break;
        }

        if (isBeforeTimePoint) {
          count++;
        }
      }

      return {
        time: formatFn(timePoint),
        count,
      };
    });
  }, [applications, timePeriod]);

  const chartConfig = {
    count: {
      label: 'Applications',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold tracking-tight">
          Application Trends
        </CardTitle>
        <div className="mt-4 flex gap-2">
          <Button
            variant={timePeriod === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('day')}
          >
            Day
          </Button>
          <Button
            variant={timePeriod === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('week')}
          >
            Week
          </Button>
          <Button
            variant={timePeriod === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('month')}
          >
            Month
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <AreaChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="count"
              fill="var(--color-count)"
              stroke="var(--color-count)"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
