'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { toast } from 'sonner';
import {
  locationSchema,
  type LocationFormValues,
} from '@/lib/validators/location';
import { LocationForm } from '../_components/LocationForm';
import { useCreateLocation } from '@/src/hooks/useCreateLocation';
import { useRouter } from 'next/navigation';

export default function NewLocationPage() {
  const router = useRouter();
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      location_id_internal: '',
      name: '',
      building_property_name: '',
      flat_unit_details: '',
      street_number: '',
      street_name: '',
      suburb: '',
      state: undefined,
      postcode: '',
    },
  });

  const createMutation = useCreateLocation();

  const handleSubmit = async (values: LocationFormValues) => {
    try {
      const payload = {
        ...values,
      };
      await createMutation.mutateAsync(payload);
      toast.success('Location created');
      router.push('/locations');
    } catch (e) {
      toast.error(String((e as Error).message || e));
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            New Location
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <CardContent>
            <LocationForm form={form} />
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/locations')}>
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(handleSubmit)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : 'Create Location'}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
