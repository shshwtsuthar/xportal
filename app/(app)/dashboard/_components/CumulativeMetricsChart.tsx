'use client';

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetDashboardCumulativeMetrics } from '@/hooks/reporting/useGetDashboardCumulativeMetrics';

const chartConfig = {
  applications: {
    label: 'Cumulative Applications',
    color: 'var(--chart-1)',
  },
  students: {
    label: 'Cumulative Students',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const tooltipFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export function CumulativeMetricsChart() {
  const { data, isLoading, isError } = useGetDashboardCumulativeMetrics();

  const chartData = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.map((point) => ({
      ...point,
      label: tooltipFormatter.format(new Date(point.date)),
      dateLabel: dateFormatter.format(new Date(point.date)),
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card aria-busy="true" aria-label="Loading cumulative metrics chart">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Year-to-date Growth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card aria-live="polite">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Year-to-date Growth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Unable to load cumulative metrics right now. Please refresh the
            page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold tracking-tight">
          Year-to-date Growth
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Daily cumulative totals showing how applications convert into enrolled
          students.
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[320px] w-full">
          <AreaChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              tickMargin={12}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <ChartTooltip
              content={<ChartTooltipContent labelKey="label" />}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              dataKey="applications"
              type="monotone"
              stroke="var(--color-applications)"
              fill="var(--color-applications)"
              fillOpacity={0.18}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
            <Area
              dataKey="students"
              type="monotone"
              stroke="var(--color-students)"
              fill="var(--color-students)"
              fillOpacity={0.18}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
