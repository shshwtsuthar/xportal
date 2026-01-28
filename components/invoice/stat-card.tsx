import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn('border-border bg-card rounded-lg border p-5', className)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-muted-foreground text-xs">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-xs font-medium',
                trend.positive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.positive ? '+' : ''}
              {trend.value}
            </p>
          )}
        </div>
        <div className="bg-secondary rounded-md p-2">
          <Icon className="text-primary h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
