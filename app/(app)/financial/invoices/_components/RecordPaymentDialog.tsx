'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRecordPayment } from '@/src/hooks/useRecordPayment';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type Props = {
  invoiceId?: string;
  invoiceType?: 'APPLICATION' | 'ENROLLMENT'; // Defaults to ENROLLMENT if not provided
  onClose: () => void;
};

type FormValues = {
  paymentDate: string;
  amountDollars: string;
  notes: string;
};

export function RecordPaymentDialog({
  invoiceId,
  invoiceType = 'ENROLLMENT',
  onClose,
}: Props) {
  const recordPayment = useRecordPayment();
  const form = useForm<FormValues>({
    defaultValues: {
      paymentDate: new Date().toISOString().slice(0, 10),
      amountDollars: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (invoiceId) {
      form.reset({
        paymentDate: new Date().toISOString().slice(0, 10),
        amountDollars: '',
        notes: '',
      });
    }
  }, [invoiceId, form]);

  const handleSave = async (values: FormValues) => {
    if (!invoiceId) return;
    try {
      const amountCents = Math.round(parseFloat(values.amountDollars) * 100);
      if (isNaN(amountCents) || amountCents <= 0) {
        toast.error('Invalid payment amount');
        return;
      }
      const paymentId = await recordPayment.mutateAsync({
        invoiceId,
        invoiceType,
        paymentDate: values.paymentDate,
        amountCents,
        notes: values.notes || undefined,
      });

      // Trigger commission calculation (fire and forget)
      try {
        const supabase = createClient();
        const { data, error } = await supabase.functions.invoke(
          'calculate-agent-commission',
          {
            body: { paymentId },
          }
        );

        if (error) {
          console.error('Commission calculation error:', error);
          // Don't show error to user - commission calculation is background process
        } else if (data?.created) {
          // Optionally show success message if commission was created
          // toast.success('Commission generated for agent');
        }
      } catch (commissionErr) {
        console.error(
          'Failed to trigger commission calculation:',
          commissionErr
        );
        // Silently fail - commission calculation is non-blocking
      }

      toast.success('Payment recorded successfully');
      onClose();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={!!invoiceId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Record Payment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSave)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              type="date"
              {...form.register('paymentDate', { required: true })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amountDollars">Amount ($)</Label>
            <Input
              id="amountDollars"
              type="number"
              step="0.01"
              placeholder="500.00"
              {...form.register('amountDollars', { required: true })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Reconciliation Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Bank transfer, reference #12345"
              {...form.register('notes')}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
