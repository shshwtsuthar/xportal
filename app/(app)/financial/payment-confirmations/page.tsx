import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageContainer } from '@/components/page-container';
import { PaymentConfirmationsColumnsMenu } from './_components/PaymentConfirmationsColumnsMenu';
import { PaymentConfirmationsDataTable } from './_components/PaymentConfirmationsDataTable';

export default function PaymentConfirmationsPage() {
  return (
    <PageContainer
      title="Payment Confirmations"
      description="Review recorded payments and confirm which ones should be synced to Xero."
    >
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
    </PageContainer>
  );
}
