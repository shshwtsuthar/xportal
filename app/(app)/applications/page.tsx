'use client';

import { useState } from 'react';
import type { Database } from '@/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="status">Status</Label>
            <Select
              onValueChange={(v) =>
                setStatus(v === 'all' ? undefined : (v as ApplicationStatus))
              }
            >
              <SelectTrigger id="status" className="w-40">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="OFFER_GENERATED">Offer Generated</SelectItem>
                <SelectItem value="OFFER_SENT">Offer Sent</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button asChild>
            <Link href="/applications/new">
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Applications
          </CardTitle>
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
