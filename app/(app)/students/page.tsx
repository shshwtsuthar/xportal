'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StudentsDataTable } from './_components/StudentsDataTable';
import type { Enums } from '@/database.types';

type StudentStatus = Enums<'student_status'>;

export default function StudentsPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StudentStatus | undefined>(undefined);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-muted-foreground text-sm">
            View and manage students
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Students
          </CardTitle>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full max-w-md items-center gap-2">
              <Input
                placeholder="Search name or email"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search students"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={status === undefined ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus(undefined)}
              >
                All
              </Button>
              <Button
                variant={status === 'ACTIVE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('ACTIVE')}
              >
                Active
              </Button>
              <Button
                variant={status === 'INACTIVE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('INACTIVE')}
              >
                Inactive
              </Button>
              <Button
                variant={status === 'COMPLETED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('COMPLETED')}
              >
                Completed
              </Button>
              <Button
                variant={status === 'WITHDRAWN' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('WITHDRAWN')}
              >
                Withdrawn
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StudentsDataTable q={q} status={status} />
        </CardContent>
      </Card>
    </div>
  );
}
