'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { LocationsDataTable } from './_components/LocationsDataTable';

export default function LocationsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
          <p className="text-muted-foreground text-sm">
            Manage RTO delivery locations for AVETMISS reporting
          </p>
        </div>
        <Button asChild>
          <Link href="/locations/new">
            <Plus className="mr-2 h-4 w-4" />
            New Location
          </Link>
        </Button>
      </div>

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
    </div>
  );
}
