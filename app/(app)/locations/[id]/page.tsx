'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit } from 'lucide-react';
import { useGetLocation } from '@/src/hooks/useGetLocation';

const stateMap: Record<string, string> = {
  VIC: 'Victoria',
  NSW: 'New South Wales',
  QLD: 'Queensland',
  SA: 'South Australia',
  WA: 'Western Australia',
  TAS: 'Tasmania',
  NT: 'Northern Territory',
  ACT: 'Australian Capital Territory',
};

export default function LocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data: location, isLoading, isError } = useGetLocation(id);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Loading...</h1>
        </div>
      </div>
    );
  }

  if (isError || !location) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Location Not Found
          </h1>
          <p className="text-muted-foreground text-sm">
            The requested location could not be found.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/locations')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Locations
        </Button>
      </div>
    );
  }

  // Format full address
  const addressParts = [
    location.building_property_name,
    location.flat_unit_details,
    location.street_number,
    location.street_name,
    location.suburb,
    stateMap[location.state || ''] || location.state,
    location.postcode,
  ].filter(Boolean);

  const fullAddress = addressParts.join(', ');

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {location.name}
          </h1>
          <p className="text-muted-foreground text-sm">Location Details</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/locations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Locations
          </Button>
          <Button asChild>
            <Link href={`/locations/edit/${location.id}`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Location Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm">
                Location Identifier
              </p>
              <p className="text-base">{location.location_id_internal}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Location Name</p>
              <p className="text-base">{location.name}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">
                Building/Property Name
              </p>
              <p className="text-base">
                {location.building_property_name || '—'}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Flat/Unit Details</p>
              <p className="text-base">{location.flat_unit_details || '—'}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Street Number</p>
              <p className="text-base">{location.street_number || '—'}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Street Name</p>
              <p className="text-base">{location.street_name || '—'}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Suburb/City</p>
              <p className="text-base">{location.suburb || '—'}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">State</p>
              <p className="text-base">
                {location.state
                  ? stateMap[location.state] || location.state
                  : '—'}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Postcode</p>
              <p className="text-base">{location.postcode || '—'}</p>
            </div>

            <div className="md:col-span-2">
              <p className="text-muted-foreground text-sm">Full Address</p>
              <p className="text-base">{fullAddress || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
