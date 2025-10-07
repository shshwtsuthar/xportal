'use client';

import { useState } from 'react';
import type { Database } from '@/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApplicationsDataTable } from './_components/ApplicationsDataTable';
import Link from 'next/link';
import { Plus } from 'lucide-react';

type ApplicationStatus = Database['public']['Enums']['application_status'];

export default function ApplicationsPage() {
  const [status, setStatus] = useState<ApplicationStatus | undefined>(
    undefined
  );

  return (
    <div className="container p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Applications
          </h1>
          <p className="text-muted-foreground text-sm">
            View and manage student applications
          </p>
        </div>
        <Button asChild>
          <Link href="/applications/new">
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Applications
          </CardTitle>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant={status === undefined ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus(undefined)}
            >
              All
            </Button>
            <Button
              variant={status === 'DRAFT' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus('DRAFT')}
            >
              Draft
            </Button>
            <Button
              variant={status === 'SUBMITTED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus('SUBMITTED')}
            >
              Submitted
            </Button>
            <Button
              variant={status === 'OFFER_GENERATED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus('OFFER_GENERATED')}
            >
              Offer Generated
            </Button>
            <Button
              variant={status === 'OFFER_SENT' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus('OFFER_SENT')}
            >
              Offer Sent
            </Button>
            <Button
              variant={status === 'ACCEPTED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus('ACCEPTED')}
            >
              Accepted
            </Button>
            <Button
              variant={status === 'REJECTED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus('REJECTED')}
            >
              Rejected
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ApplicationsDataTable
            statusFilter={status && status.length ? status : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
