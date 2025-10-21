'use client';

import { useParams } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { draftApplicationSchema } from '@/lib/validators/application';
import { Step1_PersonalDetails } from '@/app/(app)/applications/_components/steps/Step1_PersonalDetails';
import { Step2_AvetmissDetails } from '@/app/(app)/applications/_components/steps/Step2_AvetmissDetails';
import { Step3_Cricos } from '@/app/(app)/applications/_components/steps/Step3_Cricos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

type FormValues = Partial<
  ReturnType<(typeof draftApplicationSchema)['parse']>
> & {
  requested_start_date?: string | Date;
};

export default function AgentIntakePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const [submitted, setSubmitted] = useState(false);
  const [agentName, setAgentName] = useState<string>('');

  // Fetch agent name via public API
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(
          `/api/public/agent?slug=${encodeURIComponent(slug)}`
        );
        if (!res.ok) throw new Error('Agent not found');
        const j = await res.json();
        setAgentName(j.name || 'Agent');
      } catch {
        setAgentName('Agent');
      }
    };
    if (slug) run();
  }, [slug]);

  const form = useForm<FormValues>({
    resolver: zodResolver(draftApplicationSchema),
    defaultValues: {
      salutation: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      preferred_name: '',
      date_of_birth: '',
      email: '',
      work_phone: '',
      mobile_phone: '',
      alternative_email: '',
      address_line_1: '',
      suburb: '',
      state: '',
      postcode: '',
      street_building_name: '',
      street_unit_details: '',
      street_number_name: '',
      street_po_box: '',
      street_country: 'Australia',
      postal_is_same_as_street: false,
      postal_building_name: '',
      postal_unit_details: '',
      postal_number_name: '',
      postal_po_box: '',
      postal_suburb: '',
      postal_state: '',
      postal_postcode: '',
      postal_country: 'Australia',
      gender: '',
      highest_school_level_id: '',
      indigenous_status_id: '',
      labour_force_status_id: '',
      country_of_birth_id: '',
      language_code: '',
      citizenship_status_code: '',
      at_school_flag: '',
      is_international: false,
      usi: '',
      passport_number: '',
      visa_type: '',
      visa_number: '',
      country_of_citizenship: '',
      ielts_score: '',
      ec_name: '',
      ec_relationship: '',
      ec_phone_number: '',
      g_name: '',
      g_email: '',
      g_phone_number: '',
      requested_start_date: '',
    },
  });

  const handleSubmit = async () => {
    try {
      const values = form.getValues();
      const payload = {
        agent_slug: slug,
        ...values,
        requested_start_date: values.requested_start_date || null,
      };
      const res = await fetch('/api/public/agent-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Submission failed');
      }
      setSubmitted(true);
      toast.success(
        'Application submitted as draft. Our staff will follow up.'
      );
    } catch (e) {
      toast.error(String((e as Error).message || e));
    }
  };

  if (submitted) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Thank you</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your application details were received. Our admissions team will
              contact you soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{agentName}</h1>
        <p className="text-muted-foreground text-sm">
          Submit a new student application
        </p>
      </div>

      <FormProvider {...form}>
        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Step1_PersonalDetails hideAgent />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Step2_AvetmissDetails />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                International Student Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Step3_Cricos />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requested Start Date</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="requested_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requested start date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          typeof field.value === 'string' ? field.value : ''
                        }
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} aria-label="Submit application">
              Submit Application
            </Button>
          </div>
        </div>
      </FormProvider>
    </div>
  );
}
