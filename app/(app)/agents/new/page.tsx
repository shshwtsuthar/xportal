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
import { agentSchema, type AgentFormValues } from '@/lib/validators/agent';
import { AgentForm } from '../_components/AgentForm';
import { useCreateAgent } from '@/src/hooks/useCreateAgent';
import { useRouter } from 'next/navigation';

export default function NewAgentPage() {
  const router = useRouter();
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
    },
  });

  const createMutation = useCreateAgent();

  const handleSubmit = async (values: AgentFormValues) => {
    try {
      const payload = {
        ...values,
      };
      await createMutation.mutateAsync(payload);
      toast.success('Agent created');
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
            New Agent
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
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : 'Create Agent'}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
