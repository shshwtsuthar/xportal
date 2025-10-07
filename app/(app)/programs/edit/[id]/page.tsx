'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useParams, useRouter } from 'next/navigation';
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
  programSchema,
  type ProgramFormValues,
} from '@/lib/validators/program';
import { ProgramForm } from '../../_components/ProgramForm';
import { createClient } from '@/lib/supabase/client';
import { useUpdateProgram } from '@/src/hooks/useUpdateProgram';

export default function EditProgramPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      code: '',
      name: '',
      nominal_hours: 0,
      level_of_education_id: '',
      field_of_education_id: '',
      recognition_id: '',
      vet_flag: 'Y',
      anzsco_id: '',
      anzsic_id: '',
    },
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        toast.error('Failed to load program');
        return;
      }
      form.reset({
        code: data.code ?? '',
        name: data.name ?? '',
        nominal_hours: (data.nominal_hours as number) ?? 0,
        level_of_education_id: (data.level_of_education_id as string) ?? '',
        field_of_education_id: (data.field_of_education_id as string) ?? '',
        recognition_id: (data.recognition_id as string) ?? '',
        vet_flag: (data.vet_flag as 'Y' | 'N') ?? 'Y',
        anzsco_id: (data.anzsco_id as string) ?? '',
        anzsic_id: (data.anzsic_id as string) ?? '',
      });
    };
    if (id) void load();
  }, [id, form]);

  const updateMutation = useUpdateProgram();

  const handleSubmit = async (values: ProgramFormValues) => {
    try {
      await updateMutation.mutateAsync({ id, ...values });
      toast.success('Program updated');
      router.push('/programs');
    } catch (e) {
      toast.error(String((e as Error).message || e));
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Edit Program
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <CardContent>
            <ProgramForm form={form} />
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/programs')}>
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(handleSubmit)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
