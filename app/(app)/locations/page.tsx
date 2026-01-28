'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/page-container';
import { Plus } from 'lucide-react';
import { LocationsDataTable } from './_components/LocationsDataTable';

export default function LocationsPage() {
  return (
    <PageContainer
      title="Locations"
      description="Manage RTO delivery locations for AVETMISS reporting"
      actions={
        <Button asChild>
          <Link href="/locations/new">
            <Plus className="mr-2 h-4 w-4" />
            New Location
          </Link>
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LocationsDataTable />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
