'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/page-container';
import { Plus } from 'lucide-react';
import { ProgramsDataTable } from './_components/ProgramsDataTable';

export default function ProgramsPage() {
  return (
    <PageContainer
      title="Programs"
      description="Manage what programs your RTO offers"
      actions={
        <Button asChild>
          <Link href="/programs/new">
            <Plus className="mr-2 h-4 w-4" />
            New Program
          </Link>
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Programs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgramsDataTable />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
