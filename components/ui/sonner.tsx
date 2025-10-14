'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster"
      toastOptions={{
        classNames: {
          toast: 'bg-background text-foreground border border-border shadow-sm',
          title: 'font-medium',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground hover:opacity-90',
          cancelButton: 'bg-muted text-muted-foreground',
          closeButton: 'text-muted-foreground hover:text-foreground',
        },
      }}
      style={
        {
          '--normal-bg': 'hsl(var(--background))',
          '--normal-text': 'hsl(var(--foreground))',
          '--normal-border': 'hsl(var(--border))',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
