'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Search,
  ArrowUpDown,
  Eye,
  Download,
  RefreshCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: 'credit_card' | 'bank_transfer' | 'check' | 'cash' | 'paypal';
  reference: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  processedBy: string;
}

interface PaymentsTableProps {
  payments: Payment[];
  currency?: string;
}

const statusConfig: Record<
  Payment['status'],
  { label: string; className: string }
> = {
  completed: {
    label: 'Completed',
    className: 'bg-success/15 text-success border-success/30',
  },
  pending: {
    label: 'Pending',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  failed: {
    label: 'Failed',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
  refunded: {
    label: 'Refunded',
    className: 'bg-muted text-muted-foreground border-muted-foreground/30',
  },
};

const methodLabels: Record<Payment['method'], string> = {
  credit_card: 'Credit Card',
  bank_transfer: 'Bank Transfer',
  check: 'Check',
  cash: 'Cash',
  paypal: 'PayPal',
};

export function PaymentsTable({
  payments,
  currency = 'USD',
}: PaymentsTableProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [sortConfig, setSortConfig] = React.useState<{
    key: keyof Payment;
    direction: 'asc' | 'desc';
  } | null>(null);

  const filteredPayments = React.useMemo(() => {
    let result = [...payments];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (payment) =>
          payment.reference.toLowerCase().includes(query) ||
          payment.processedBy.toLowerCase().includes(query) ||
          methodLabels[payment.method].toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((payment) => payment.status === statusFilter);
    }

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [payments, searchQuery, statusFilter, sortConfig]);

  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key: keyof Payment) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-muted-foreground text-sm">
          {filteredPayments.length} payment
          {filteredPayments.length !== 1 && 's'}
        </div>
      </div>

      {/* Table */}
      <div className="border-border rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  Date
                  <ArrowUpDown className="text-muted-foreground h-3.5 w-3.5" />
                </div>
              </TableHead>
              <TableHead>Reference</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center gap-1">
                  Amount
                  <ArrowUpDown className="text-muted-foreground h-3.5 w-3.5" />
                </div>
              </TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Processed By</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPayments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center"
                >
                  No payments found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(payment.date)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {payment.reference}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>{methodLabels[payment.method]}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(statusConfig[payment.status].className)}
                    >
                      {statusConfig[payment.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.processedBy}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download Receipt
                        </DropdownMenuItem>
                        {payment.status === 'completed' && (
                          <DropdownMenuItem className="text-destructive">
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Request Refund
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <span>Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            Page {currentPage} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
              <span className="sr-only">First page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronsRight className="h-4 w-4" />
              <span className="sr-only">Last page</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
