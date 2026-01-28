'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/page-container';
import { Plus } from 'lucide-react';
import { SubjectsDataTable } from './_components/SubjectsDataTable';

export default function SubjectsPage() {
  return (
    <PageContainer
      title="Subjects"
      description="Manage units of competency for your programs"
      actions={
        <Button asChild>
          <Link href="/subjects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Subject
          </Link>
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Subjects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SubjectsDataTable />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
