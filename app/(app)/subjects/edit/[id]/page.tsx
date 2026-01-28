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
  subjectSchema,
  type SubjectFormValues,
} from '@/lib/validators/subject';
import { SubjectForm } from '../../_components/SubjectForm';
import { createClient } from '@/lib/supabase/client';
import { useUpdateSubject } from '@/src/hooks/useUpdateSubject';
import { PageContainer } from '@/components/page-container';

export default function EditSubjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

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

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        toast.error('Failed to load subject');
        return;
      }
      form.reset({
        code: data.code ?? '',
        name: data.name ?? '',
        nominal_hours: (data.nominal_hours as number) ?? 0,
        field_of_education_id: (data.field_of_education_id as string) ?? '',
        vet_flag: (data.vet_flag as 'Y' | 'N') ?? 'Y',
      });
    };
    if (id) void load();
  }, [id, form]);

  const updateMutation = useUpdateSubject();

  const handleSubmit = async (values: SubjectFormValues) => {
    try {
      await updateMutation.mutateAsync({ id, ...values });
      toast.success('Subject updated');
      router.push('/subjects');
    } catch (e) {
      toast.error(String((e as Error).message || e));
    }
  };

  return (
    <PageContainer title="Edit Subject">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Edit Subject
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
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </PageContainer>
  );
}
