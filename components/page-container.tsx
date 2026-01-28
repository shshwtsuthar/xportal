import * as React from 'react';
import { cn } from '@/lib/utils';

type PageContainerVariant = 'default' | 'fullWidth';

type PageContainerProps = {
  children?: React.ReactNode;
  /** Page title (h1) */
  title?: string;
  /** Subtitle or description under the title */
  description?: string;
  /** Optional actions (e.g. primary button) shown in the header row */
  actions?: React.ReactNode;
  /** `default`: constrained width (container). `fullWidth`: no max-width. */
  variant?: PageContainerVariant;
  /** Extra class names for the outer wrapper */
  className?: string;
};

const containerClasses: Record<PageContainerVariant, string> = {
  default: 'container mx-auto p-4 md:p-6 lg:p-8',
  fullWidth: 'mx-auto w-full max-w-full p-4 md:p-6 lg:p-8',
};

export const PageContainer = React.forwardRef<
  HTMLDivElement,
  PageContainerProps
>(
  (
    { children, title, description, actions, variant = 'default', className },
    ref
  ) => {
    const hasHeader = Boolean(title ?? description ?? actions);

    return (
      <div
        ref={ref}
        className={cn(containerClasses[variant], className)}
        role="main"
        aria-label={title ?? undefined}
      >
        {hasHeader && (
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              {title != null && (
                <h1 className="text-2xl font-semibold tracking-tight">
                  {title}
                </h1>
              )}
              {description != null && (
                <p className="text-muted-foreground text-sm">{description}</p>
              )}
            </div>
            {actions != null && (
              <div className="flex shrink-0 items-center gap-2">{actions}</div>
            )}
          </header>
        )}
        {children}
      </div>
    );
  }
);

PageContainer.displayName = 'PageContainer';
