'use client';

import * as React from 'react';
import { ComposeEmailDialog } from '@/components/emails/ComposeEmailDialog';

type ComposeEmailContextValue = {
  isOpen: boolean;
  open: () => void;
  openWithRecipients: (recipients: string[]) => void;
  close: () => void;
};

const ComposeEmailContext =
  React.createContext<ComposeEmailContextValue | null>(null);

export const useComposeEmail = (): ComposeEmailContextValue => {
  const ctx = React.useContext(ComposeEmailContext);
  if (!ctx) throw new Error('useComposeEmail must be used within provider');
  return ctx;
};

export default function ComposeEmailProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [initialRecipients, setInitialRecipients] = React.useState<string[]>(
    []
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Clear initial recipients on close
      setTimeout(() => setInitialRecipients([]), 0);
    }
  }, []);

  const open = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const openWithRecipients = React.useCallback((recipients: string[]) => {
    setInitialRecipients(recipients);
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = React.useMemo(
    () => ({
      isOpen,
      open,
      openWithRecipients,
      close,
    }),
    [isOpen, open, openWithRecipients, close]
  );

  return (
    <ComposeEmailContext.Provider value={value}>
      {children}
      <ComposeEmailDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        initialRecipients={initialRecipients}
      />
    </ComposeEmailContext.Provider>
  );
}
