'use client';

import React, { useState } from 'react';
import { Tables } from '@/database.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DepositInvoicesPanel } from './DepositInvoicesPanel';
import { Skeleton } from '@/components/ui/skeleton';

type ApplicationWithDeposits = Tables<'applications'> & {
  programs?: Pick<Tables<'programs'>, 'name'> | null;
  payment_plan_templates?: Pick<
    Tables<'payment_plan_templates'>,
    'name'
  > | null;
  deposit_summary?: {
    total_due: number;
    total_paid: number;
    unpaid_count: number;
  };
};

type Props = {
  data: ApplicationWithDeposits[];
  isLoading: boolean;
  isError: boolean;
};

export function DepositsDataTable({ data, isLoading, isError }: Props) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const toggleRow = (appId: string) => {
    setExpandedRowId((prev) => (prev === appId ? null : appId));
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive text-sm">
        Failed to load applicants with deposits.
      </p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No applicants with deposit requirements found.
      </p>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="divide-x">
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Applicant Name</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Payment Plan</TableHead>
            <TableHead className="text-right">Total Due</TableHead>
            <TableHead className="text-right">Total Paid</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y">
          {data.map((app) => {
            const isExpanded = expandedRowId === app.id;
            const summary = app.deposit_summary;
            const allPaid = (summary?.unpaid_count ?? 0) === 0;
            const fullName =
              `${app.first_name || ''} ${app.last_name || ''}`.trim();

            return (
              <React.Fragment key={app.id}>
                <TableRow
                  className="hover:bg-muted/50 cursor-pointer divide-x"
                  onClick={() => toggleRow(app.id)}
                >
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRow(app.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">
                    {fullName || 'N/A'}
                  </TableCell>
                  <TableCell>{app.programs?.name ?? '—'}</TableCell>
                  <TableCell>
                    {app.payment_plan_templates?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(summary?.total_due ?? 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(summary?.total_paid ?? 0)}
                  </TableCell>
                  <TableCell>
                    {allPaid ? (
                      <Badge variant="default">Fully Paid</Badge>
                    ) : (
                      <Badge variant="destructive">
                        {summary?.unpaid_count} Unpaid
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>

                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={7} className="border-t p-0">
                      <div className="bg-muted/30 px-4 py-3">
                        <DepositInvoicesPanel applicationId={app.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
