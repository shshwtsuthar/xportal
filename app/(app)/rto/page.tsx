'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { RtoFormValues, rtoSchema } from '@/lib/validators/rto';
import { useGetRto } from '@/src/hooks/useGetRto';
import { useUpdateRto } from '@/src/hooks/useUpdateRto';
import { RtoForm } from './_components/RtoForm';
import { RtoProfileImageSection } from './_components/RtoProfileImageSection';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';

export default function RtoPage() {
  const { data: rto, isLoading, error } = useGetRto();
  const updateRto = useUpdateRto();

  const form = useForm<RtoFormValues>({
    resolver: zodResolver(rtoSchema),
    defaultValues: {
      name: '',
      rto_code: '',
      address_line_1: '',
      suburb: '',
      state: undefined,
      postcode: '',
      type_identifier: '',
      phone_number: '',
      facsimile_number: '',
      email_address: '',
      contact_name: '',
      statistical_area_1_id: '',
      statistical_area_2_id: '',
    },
  });

  // Populate form when RTO data is loaded
  useEffect(() => {
    if (rto) {
      form.reset({
        name: rto.name || '',
        rto_code: rto.rto_code || '',
        address_line_1: rto.address_line_1 || '',
        suburb: rto.suburb || '',
        state: rto.state as
          | 'VIC'
          | 'NSW'
          | 'QLD'
          | 'SA'
          | 'WA'
          | 'TAS'
          | 'NT'
          | 'ACT'
          | undefined,
        postcode: rto.postcode || '',
        type_identifier: rto.type_identifier || '',
        phone_number: rto.phone_number || '',
        facsimile_number: rto.facsimile_number || '',
        email_address: rto.email_address || '',
        contact_name: rto.contact_name || '',
        statistical_area_1_id: rto.statistical_area_1_id || '',
        statistical_area_2_id: rto.statistical_area_2_id || '',
        profile_image_path: rto.profile_image_path || undefined,
      });
    }
  }, [rto, form]);

  const handleSaveDraft = async () => {
    try {
      const values = form.getValues();
      const { profile_image_path: _profileImagePath, ...formValues } = values;

      // Validate format before saving
      const validationResult = rtoSchema.safeParse(values);

      if (!validationResult.success) {
        console.log('Validation failed:', validationResult.error.issues);
        // Set form errors for display
        validationResult.error.issues.forEach((issue) => {
          const fieldName = issue.path.join('.') as string;
          form.setError(fieldName as never, {
            message: issue.message,
          });
        });
        toast.error('Please fix validation errors before saving.');
        return;
      }

      // Clean up empty strings
      const cleanedValues = {
        name: formValues.name,
        rto_code: formValues.rto_code,
        address_line_1: formValues.address_line_1 || null,
        suburb: formValues.suburb || null,
        state: formValues.state || null,
        postcode: formValues.postcode || null,
        type_identifier: formValues.type_identifier || null,
        phone_number: formValues.phone_number || null,
        facsimile_number: formValues.facsimile_number || null,
        email_address: formValues.email_address || null,
        contact_name: formValues.contact_name || null,
        statistical_area_1_id: formValues.statistical_area_1_id || null,
        statistical_area_2_id: formValues.statistical_area_2_id || null,
      };

      await updateRto.mutateAsync(cleanedValues);
      toast.success('RTO information updated successfully!');
    } catch (error) {
      toast.error('Failed to update RTO information. Please try again.');
      console.error('Error updating RTO:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-96" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              RTO Management
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage your RTO information and settings
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-destructive text-center">
              <p>Failed to load RTO information. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            RTO Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your RTO information and settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={updateRto.isPending}
          >
            {updateRto.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            RTO Information
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <CardContent className="space-y-6">
            <RtoProfileImageSection
              profileImagePath={rto?.profile_image_path}
            />
            <RtoForm form={form} />
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <div className="flex gap-2">
              {/* Empty div to maintain layout consistency */}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={updateRto.isPending}
              >
                {updateRto.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
