'use client';

import * as React from 'react';
import { ComposeEmailDialog } from '@/components/emails/ComposeEmailDialog';

type ComposeEmailContextValue = {
  isOpen: boolean;
  open: () => void;
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
  const value = React.useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen]
  );

  return (
    <ComposeEmailContext.Provider value={value}>
      {children}
      <ComposeEmailDialog open={isOpen} onOpenChange={setIsOpen} />
    </ComposeEmailContext.Provider>
  );
}
