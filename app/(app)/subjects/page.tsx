'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { SubjectsDataTable } from './_components/SubjectsDataTable';

export default function SubjectsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground text-sm">
            Manage units of competency for your programs
          </p>
        </div>
        <Button asChild>
          <Link href="/subjects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Subject
          </Link>
        </Button>
      </div>

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
    </div>
  );
}
