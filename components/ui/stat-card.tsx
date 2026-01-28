import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import type { ReactNode } from 'react';

type StatCardVariant = 'stat' | 'content';

interface BaseStatCardProps {
  className?: string;
  variant?: StatCardVariant;
}

interface StatCardStatProps extends BaseStatCardProps {
  variant?: 'stat';
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  children?: never;
  footer?: never;
  description?: never;
}

interface StatCardContentProps extends BaseStatCardProps {
  variant: 'content';
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  value?: never;
  subtitle?: never;
  icon?: never;
  trend?: never;
}

type StatCardProps = StatCardStatProps | StatCardContentProps;

export function StatCard(props: StatCardProps) {
  const { className, variant = 'stat' } = props;

  if (variant === 'content') {
    const { title, description, children, footer } =
      props as StatCardContentProps;
    return (
      <Card className={cn(className)}>
        {(title || description) && (
          <CardHeader>
            {title && (
              <CardTitle className="text-xl font-semibold tracking-tight">
                {title}
              </CardTitle>
            )}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>{children}</CardContent>
        {footer && <CardFooter>{footer}</CardFooter>}
      </Card>
    );
  }

  // Stat variant
  const {
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
  } = props as StatCardStatProps;

  return (
    <Card className={cn('p-5', className)}>
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
        {Icon && (
          <div className="bg-secondary rounded-md p-2">
            <Icon className="text-primary h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
