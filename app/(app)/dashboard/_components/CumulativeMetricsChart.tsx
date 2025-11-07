'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from '@/components/ui/button-group';
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
import {
  useGetDashboardCumulativeMetrics,
  getYearToDateRange,
  getLast30DaysRange,
  getLast3MonthsRange,
  getLast6MonthsRange,
  getLastYearRange,
} from '@/hooks/reporting/useGetDashboardCumulativeMetrics';
import { DateRangePicker } from './DateRangePicker';

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

type DateRangeType =
  | 'year-to-date'
  | 'last-30-days'
  | 'last-3-months'
  | 'last-6-months'
  | 'last-year'
  | 'custom';

const getRangeTitle = (rangeType: DateRangeType): string => {
  switch (rangeType) {
    case 'year-to-date':
      return 'Year-to-date Growth';
    case 'last-30-days':
      return 'Last 30 Days Growth';
    case 'last-3-months':
      return 'Last 3 Months Growth';
    case 'last-6-months':
      return 'Last 6 Months Growth';
    case 'last-year':
      return 'Last Year Growth';
    case 'custom':
      return 'Custom Range Growth';
    default:
      return 'Year-to-date Growth';
  }
};

export function CumulativeMetricsChart() {
  const [rangeType, setRangeType] = useState<DateRangeType>('year-to-date');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const dateRange = useMemo(() => {
    if (rangeType === 'custom' && customRange?.from && customRange?.to) {
      return { start: customRange.from, end: customRange.to };
    }

    switch (rangeType) {
      case 'year-to-date':
        return getYearToDateRange();
      case 'last-30-days':
        return getLast30DaysRange();
      case 'last-3-months':
        return getLast3MonthsRange();
      case 'last-6-months':
        return getLast6MonthsRange();
      case 'last-year':
        return getLastYearRange();
      default:
        return getYearToDateRange();
    }
  }, [rangeType, customRange]);

  const { data, isLoading, isError } = useGetDashboardCumulativeMetrics(
    dateRange.start,
    dateRange.end
  );

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

  const handleRangeTypeChange = (newRangeType: DateRangeType) => {
    setRangeType(newRangeType);
    if (newRangeType !== 'custom') {
      setCustomRange(undefined);
      setIsDatePickerOpen(false);
    } else {
      setIsDatePickerOpen(true);
    }
  };

  const handleDatePickerOpenChange = (open: boolean) => {
    setIsDatePickerOpen(open);
    if (open) {
      setRangeType('custom');
    }
  };

  const handleCustomRangeChange = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from && range?.to) {
      setRangeType('custom');
    }
  };

  // Only show loading skeleton on initial load (when there's no data)
  if (isLoading && !data) {
    return (
      <Card aria-busy="true" aria-label="Loading cumulative metrics chart">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight">
                {getRangeTitle(rangeType)}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Daily cumulative totals showing how applications convert into
                enrolled students.
              </p>
            </div>
          </div>
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
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight">
                {getRangeTitle(rangeType)}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Daily cumulative totals showing how applications convert into
                enrolled students.
              </p>
            </div>
          </div>
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight">
              {getRangeTitle(rangeType)}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Daily cumulative totals showing how applications convert into
              enrolled students.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ButtonGroup aria-label="Date range selection">
              <Button
                variant={rangeType === 'year-to-date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRangeTypeChange('year-to-date')}
              >
                Year to Date
              </Button>
              <Button
                variant={rangeType === 'last-30-days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRangeTypeChange('last-30-days')}
              >
                Last 30 Days
              </Button>
              <Button
                variant={rangeType === 'last-3-months' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRangeTypeChange('last-3-months')}
              >
                Last 3 Months
              </Button>
              <Button
                variant={rangeType === 'last-6-months' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRangeTypeChange('last-6-months')}
              >
                Last 6 Months
              </Button>
              <Button
                variant={rangeType === 'last-year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRangeTypeChange('last-year')}
              >
                Last Year
              </Button>
              <ButtonGroupSeparator />
              <DateRangePicker
                value={customRange}
                onChange={handleCustomRangeChange}
                open={isDatePickerOpen}
                onOpenChange={handleDatePickerOpenChange}
                trigger={
                  <Button
                    variant={rangeType === 'custom' ? 'default' : 'outline'}
                    size="sm"
                  >
                    Custom
                  </Button>
                }
              />
            </ButtonGroup>
          </div>
        </div>
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
              type="basis"
              stroke="var(--color-applications)"
              fill="var(--color-applications)"
              fillOpacity={0.18}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 5 }}
            />
            <Area
              dataKey="students"
              type="basis"
              stroke="var(--color-students)"
              fill="var(--color-students)"
              fillOpacity={0.18}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
