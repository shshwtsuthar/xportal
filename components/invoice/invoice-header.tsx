import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Download,
  Mail,
  MoreHorizontal,
  Printer,
  Edit,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface InvoiceHeaderProps {
  invoiceNumber: string;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  clientName?: string;
  clientEmail?: string;
  backHref?: string;
  onDownload?: () => void;
  showSendReminder?: boolean;
  showMoreMenu?: boolean;
}

const statusConfig: Record<
  InvoiceHeaderProps['status'],
  { label: string; className: string }
> = {
  paid: {
    label: 'Paid',
    className: 'bg-success/15 text-success border-success/30',
  },
  partial: {
    label: 'Partially Paid',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  unpaid: {
    label: 'Unpaid',
    className: 'bg-muted text-muted-foreground border-muted-foreground/30',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
};

export function InvoiceHeader({
  invoiceNumber,
  status,
  clientName,
  clientEmail,
  backHref = '#',
  onDownload,
  showSendReminder = true,
  showMoreMenu = true,
}: InvoiceHeaderProps) {
  const hasClient =
    (clientName?.trim() ?? '') !== '' || (clientEmail?.trim() ?? '') !== '';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-3">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
          aria-label="Back to Invoices"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Invoices
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Invoice {invoiceNumber}
          </h1>
          <Badge
            variant="outline"
            className={cn(statusConfig[status].className)}
          >
            {statusConfig[status].label}
          </Badge>
        </div>
        {hasClient && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            {(clientName?.trim() ?? '') !== '' && (
              <span className="text-foreground font-medium">{clientName}</span>
            )}
            {(clientName?.trim() ?? '') !== '' &&
              (clientEmail?.trim() ?? '') !== '' && <span>•</span>}
            {(clientEmail?.trim() ?? '') !== '' && <span>{clientEmail}</span>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showSendReminder && (
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Send Reminder
          </Button>
        )}
        {onDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            type="button"
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        )}
        {showMoreMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-transparent"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Printer className="mr-2 h-4 w-4" />
                Print Invoice
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Invoice
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
