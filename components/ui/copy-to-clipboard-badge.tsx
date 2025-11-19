'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Badge, type badgeVariants } from '@/components/ui/badge';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

type CopyToClipboardBadgeProps = {
  value: string;
  label?: string;
  resetDelayMs?: number;
  variant?: NonNullable<Parameters<typeof badgeVariants>[0]>['variant'];
  className?: string;
};

const DEFAULT_RESET_DELAY = 2000;

export const CopyToClipboardBadge = ({
  value,
  label,
  resetDelayMs = DEFAULT_RESET_DELAY,
  variant = 'outline',
  className,
}: CopyToClipboardBadgeProps) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setCopied(false), resetDelayMs);
  }, [resetDelayMs]);

  const handleCopy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      reset();
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, [reset, value]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleCopy();
      }
    },
    [handleCopy]
  );

  const iconClassName =
    'h-3.5 w-3.5 transition-all duration-200 group-data-[copied=true]:scale-90';

  return (
    <Badge
      asChild
      variant={variant}
      className={cn(
        'group hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring cursor-pointer gap-1 px-2 py-1 text-xs transition-colors duration-200 select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden',
        'aria-disabled:cursor-not-allowed aria-disabled:opacity-70',
        className
      )}
    >
      <button
        type="button"
        onClick={handleCopy}
        onKeyDown={handleKeyDown}
        aria-label={`Copy ${label ?? 'value'} to clipboard`}
        aria-live="polite"
        tabIndex={0}
        data-copied={copied}
        className="flex items-center gap-1 outline-hidden select-none"
      >
        <span className="truncate select-none">{value}</span>
        <span
          className={cn(
            'text-muted-foreground group-hover:text-foreground relative flex h-4 w-4 items-center justify-center overflow-hidden transition-colors duration-200',
            copied && 'text-green-600'
          )}
          aria-hidden="true"
        >
          <Copy
            className={cn(
              iconClassName,
              'absolute inset-0 m-auto translate-y-0 opacity-100 transition-all duration-200',
              copied && '-translate-y-2 opacity-0'
            )}
            strokeWidth={1}
          />
          <Check
            className={cn(
              iconClassName,
              'absolute inset-0 m-auto translate-y-2 opacity-0 transition-all duration-200',
              copied && 'translate-y-0 opacity-100'
            )}
            strokeWidth={1}
          />
        </span>
      </button>
    </Badge>
  );
};
