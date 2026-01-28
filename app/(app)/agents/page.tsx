'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/page-container';
import { Plus } from 'lucide-react';
import { AgentsDataTable } from './_components/AgentsDataTable';

export default function AgentsPage() {
  return (
    <PageContainer
      title="Agents"
      description="Manage recruitment agents and agencies"
      actions={
        <Button asChild>
          <Link href="/agents/new">
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Link>
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AgentsDataTable />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
