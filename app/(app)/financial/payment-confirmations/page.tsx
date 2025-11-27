import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PaymentConfirmationsColumnsMenu } from './_components/PaymentConfirmationsColumnsMenu';
import { PaymentConfirmationsDataTable } from './_components/PaymentConfirmationsDataTable';

export default function PaymentConfirmationsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Payment Confirmations
        </h1>
        <p className="text-muted-foreground text-sm">
          Review recorded payments and confirm which ones should be synced to
          Xero.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              Payments listed here have been recorded in XPortal but are not yet
              confirmed in Xero (pending, failed, or not attempted).
            </p>
            <PaymentConfirmationsColumnsMenu />
          </div>
        </CardHeader>
        <CardContent>
          <PaymentConfirmationsDataTable />
        </CardContent>
      </Card>
    </div>
  );
}
