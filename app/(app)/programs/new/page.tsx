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
  programSchema,
  type ProgramFormValues,
} from '@/lib/validators/program';
import { ProgramForm } from '../_components/ProgramForm';
import { useCreateProgram } from '@/src/hooks/useCreateProgram';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/page-container';

export default function NewProgramPage() {
  const router = useRouter();
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

  const createMutation = useCreateProgram();

  const handleSubmit = async (values: ProgramFormValues) => {
    try {
      const payload = {
        ...values,
      };
      await createMutation.mutateAsync(payload);
      toast.success('Program created');
      router.push('/programs');
    } catch (e) {
      toast.error(String((e as Error).message || e));
    }
  };

  return (
    <PageContainer title="New Program">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            New Program
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
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : 'Create Program'}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </PageContainer>
  );
}
