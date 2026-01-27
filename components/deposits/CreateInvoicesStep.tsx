'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, DollarSign, AlertCircle } from 'lucide-react';
import { useGetDepositInstallments } from '@/src/hooks/useGetDepositInstallments';
import { useCreateApplicationInvoices } from '@/src/hooks/useCreateApplicationInvoices';

const formatCurrencyAud = (cents: number) => {
  const dollars = ((cents ?? 0) / 100).toFixed(2);
  return `$${dollars}`;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

type CreateInvoicesStepProps = {
  applicationId: string;
  onInvoicesCreated: () => void;
  onClose: () => void;
};

export function CreateInvoicesStep({
  applicationId,
  onInvoicesCreated,
  onClose,
}: CreateInvoicesStepProps) {
  const {
    data: deposits,
    isLoading: isLoadingDeposits,
    error: depositsError,
  } = useGetDepositInstallments(applicationId);

  const createInvoicesMutation = useCreateApplicationInvoices();

  const handleCreate = async () => {
    try {
      await createInvoicesMutation.mutateAsync({ applicationId });
      onInvoicesCreated();
    } catch (error) {
      // Error is handled by the hook's onError
    }
  };

  const totalAmount = React.useMemo(() => {
    if (!deposits) return 0;
    return deposits.reduce((sum, deposit) => sum + deposit.amount_cents, 0);
  }, [deposits]);

  if (isLoadingDeposits) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          <p className="text-muted-foreground text-sm">
            Loading deposit installments...
          </p>
        </div>
      </div>
    );
  }

  if (depositsError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load deposit information:{' '}
            {depositsError instanceof Error
              ? depositsError.message
              : 'Unknown error'}
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </div>
    );
  }

  if (!deposits || deposits.length === 0) {
    return (
      <div className="space-y-4">
        <div className="py-4">
          <p className="text-muted-foreground text-sm">
            No deposit installments found for this application.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold tracking-tight">
            Deposit Installments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deposits.map((deposit) => (
              <div
                key={deposit.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex-1">
                  <p className="font-medium">{deposit.name}</p>
                  <p className="text-muted-foreground text-sm">
                    Due: {formatDate(deposit.due_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrencyAud(deposit.amount_cents)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="text-muted-foreground h-5 w-5" />
              <span className="font-medium">Total Amount</span>
            </div>
            <span className="text-xl font-semibold">
              {formatCurrencyAud(totalAmount)}
            </span>
          </div>
          <p className="text-muted-foreground mt-3 text-sm">
            {deposits.length} deposit invoice{deposits.length !== 1 ? 's' : ''}{' '}
            will be created
          </p>
        </CardContent>
      </Card>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={createInvoicesMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={createInvoicesMutation.isPending}
        >
          {createInvoicesMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Invoices'
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}
