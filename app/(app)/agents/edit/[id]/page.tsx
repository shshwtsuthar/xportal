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
import { agentSchema, type AgentFormValues } from '@/lib/validators/agent';
import { AgentForm } from '../../_components/AgentForm';
import { createClient } from '@/lib/supabase/client';
import { useUpdateAgent } from '@/src/hooks/useUpdateAgent';

export default function EditAgentPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
    },
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        toast.error('Failed to load agent');
        return;
      }
      form.reset({
        name: data.name ?? '',
        contact_person: (data.contact_person as string) ?? '',
        contact_email: (data.contact_email as string) ?? '',
        contact_phone: (data.contact_phone as string) ?? '',
      });
    };
    if (id) void load();
  }, [id, form]);

  const updateMutation = useUpdateAgent();

  const handleSubmit = async (values: AgentFormValues) => {
    try {
      await updateMutation.mutateAsync({ id, ...values });
      toast.success('Agent updated');
      router.push('/agents');
    } catch (e) {
      toast.error(String((e as Error).message || e));
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Edit Agent
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <CardContent>
            <AgentForm form={form} />
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/agents')}>
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
