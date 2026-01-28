import { Calendar, FileText, Building2, CreditCard } from 'lucide-react';

interface InvoiceDetailsProps {
  issueDate: string;
  dueDate: string;
  terms?: string;
  paymentMethod?: string;
  poNumber?: string;
}

export function InvoiceDetails({
  issueDate,
  dueDate,
  terms,
  paymentMethod,
  poNumber,
}: InvoiceDetailsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const details = [
    {
      icon: Calendar,
      label: 'Issue Date',
      value: formatDate(issueDate),
    },
    {
      icon: Calendar,
      label: 'Due Date',
      value: formatDate(dueDate),
    },
    ...(terms != null && terms !== ''
      ? [{ icon: FileText, label: 'Payment Terms', value: terms }]
      : []),
    ...(paymentMethod != null && paymentMethod !== ''
      ? [{ icon: CreditCard, label: 'Payment Method', value: paymentMethod }]
      : []),
    ...(poNumber != null && poNumber !== ''
      ? [{ icon: Building2, label: 'PO Number', value: poNumber }]
      : []),
  ];

  return (
    <div className="border-border bg-card rounded-lg border p-5">
      <h3 className="text-muted-foreground mb-4 text-sm font-medium">
        Invoice Details
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {details.map((detail) => (
          <div key={detail.label} className="flex items-start gap-3">
            <div className="bg-secondary rounded-md p-2">
              <detail.icon className="text-primary h-4 w-4" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{detail.label}</p>
              <p className="text-sm font-medium">{detail.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
