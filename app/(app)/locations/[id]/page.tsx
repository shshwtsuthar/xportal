'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit } from 'lucide-react';
import { useGetLocation } from '@/src/hooks/useGetLocation';
import { ClassroomsDataTable } from '../_components/ClassroomsDataTable';
import { PageContainer } from '@/components/page-container';

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
  const [activeTab, setActiveTab] = useState(0);

  const { data: location, isLoading, isError } = useGetLocation(id);

  if (isLoading) {
    return <PageContainer title="Loading..." />;
  }

  if (isError || !location) {
    return (
      <PageContainer
        title="Location Not Found"
        description="The requested location could not be found."
        actions={
          <Button variant="outline" onClick={() => router.push('/locations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Locations
          </Button>
        }
      />
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

  const renderTabContent = () => {
    if (activeTab === 0) {
      // Details Tab
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-sm">Location Identifier</p>
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
      );
    } else if (activeTab === 1) {
      // Classrooms Tab
      return <ClassroomsDataTable locationId={location.id} />;
    }
    return null;
  };

  return (
    <PageContainer
      title={location.name}
      description="Location Details"
      actions={
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
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={activeTab === 0 ? 'default' : 'outline'}
                onClick={() => setActiveTab(0)}
                aria-label="Go to Details tab"
              >
                Details
              </Button>
              <Button
                size="sm"
                variant={activeTab === 1 ? 'default' : 'outline'}
                onClick={() => setActiveTab(1)}
                aria-label="Go to Classrooms tab"
              >
                Classrooms
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>{renderTabContent()}</CardContent>
      </Card>
    </PageContainer>
  );
}
