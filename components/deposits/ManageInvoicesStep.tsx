'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Mail, ExternalLink, MoreVertical } from 'lucide-react';
import { useGenerateInvoicePdf } from '@/src/hooks/useGenerateInvoicePdf';
import { SendInvoiceComposeDialog } from './SendInvoiceComposeDialog';
import type { Tables } from '@/database.types';
import { useRouter } from 'next/navigation';

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

type ManageInvoicesStepProps = {
  applicationId: string;
  invoices: Tables<'application_invoices'>[];
  onClose: () => void;
};

export function ManageInvoicesStep({
  applicationId,
  invoices,
  onClose,
}: ManageInvoicesStepProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<
    string | null
  >(null);
  const generatePdfMutation = useGenerateInvoicePdf();
  const router = useRouter();

  const handleGeneratePdf = async (invoiceId: string) => {
    try {
      await generatePdfMutation.mutateAsync({ invoiceId });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleSendEmail = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
  };

  const handleViewInDeposits = () => {
    router.push(`/financial/deposits?applicationId=${applicationId}`);
    onClose();
  };

  if (invoices.length === 0) {
    return (
      <div className="py-8">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            No invoices found for this application.
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">Invoice Number</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">Due Date</TableHead>
                  <TableHead className="text-right font-medium">
                    Amount
                  </TableHead>
                  <TableHead className="text-right font-medium">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.status === 'SCHEDULED'
                            ? 'default'
                            : invoice.status === 'VOID'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.due_date)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrencyAud(invoice.amount_due_cents)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            aria-label="Invoice actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleGeneratePdf(invoice.id)}
                            disabled={generatePdfMutation.isPending}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Generate PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSendEmail(invoice.id)}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleViewInDeposits}
            aria-label="View in deposits page"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View in Deposits Page
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {selectedInvoiceId && (
        <SendInvoiceComposeDialog
          invoiceId={selectedInvoiceId}
          applicationId={applicationId}
          open={!!selectedInvoiceId}
          onOpenChange={(open) => {
            if (!open) setSelectedInvoiceId(null);
          }}
        />
      )}
    </>
  );
}
