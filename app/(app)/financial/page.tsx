'use client';

import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/components/page-container';

export default function FinanceDashboardPage() {
  return (
    <PageContainer
      title="Finance"
      description="KPIs and daily workflow overview"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Due This Week" value="—" />
        <StatCard title="Overdue" value="—" />
        <StatCard title="Collected MTD" value="—" />
      </div>
    </PageContainer>
  );
}
