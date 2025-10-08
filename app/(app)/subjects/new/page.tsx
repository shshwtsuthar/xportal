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
  subjectSchema,
  type SubjectFormValues,
} from '@/lib/validators/subject';
import { SubjectForm } from '../_components/SubjectForm';
import { useCreateSubject } from '@/src/hooks/useCreateSubject';
import { useRouter } from 'next/navigation';

export default function NewSubjectPage() {
  const router = useRouter();
  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      code: '',
      name: '',
      nominal_hours: 0,
      field_of_education_id: '',
      vet_flag: 'Y',
    },
  });

  const createMutation = useCreateSubject();

  const handleSubmit = async (values: SubjectFormValues) => {
    try {
      const payload = {
        ...values,
      };
      await createMutation.mutateAsync(payload);
      toast.success('Subject created');
      router.push('/subjects');
    } catch (e) {
      toast.error(String((e as Error).message || e));
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            New Subject
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <CardContent>
            <SubjectForm form={form} />
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/subjects')}>
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(handleSubmit)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : 'Create Subject'}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
