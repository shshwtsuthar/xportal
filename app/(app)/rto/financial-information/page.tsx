'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { BankInfoFormValues, bankInfoSchema } from '@/lib/validators/bank-info';
import { useGetBankInfo } from '@/src/hooks/useGetBankInfo';
import { useUpdateBankInfo } from '@/src/hooks/useUpdateBankInfo';
import { BankInfoForm } from './_components/BankInfoForm';
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
import { PageContainer } from '@/components/page-container';

export default function FinancialInformationPage() {
  const { data: bankInfo, isLoading, error } = useGetBankInfo();
  const updateBankInfo = useUpdateBankInfo();

  const form = useForm<BankInfoFormValues>({
    resolver: zodResolver(bankInfoSchema),
    defaultValues: {
      bank_name: '',
      bank_account_name: '',
      bank_bsb: '',
      bank_account_number: '',
    },
  });

  // Populate form when bank info is loaded
  useEffect(() => {
    if (bankInfo) {
      form.reset({
        bank_name: bankInfo.bank_name || '',
        bank_account_name: bankInfo.bank_account_name || '',
        bank_bsb: bankInfo.bank_bsb || '',
        bank_account_number: bankInfo.bank_account_number || '',
      });
    }
  }, [bankInfo, form]);

  const handleSave = async () => {
    try {
      const values = form.getValues();

      // Validate format before saving
      const validationResult = bankInfoSchema.safeParse(values);

      if (!validationResult.success) {
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
      const cleanedValues: BankInfoFormValues = {
        bank_name: values.bank_name || undefined,
        bank_account_name: values.bank_account_name || undefined,
        bank_bsb: values.bank_bsb || undefined,
        bank_account_number: values.bank_account_number || undefined,
      };

      await updateBankInfo.mutateAsync(cleanedValues);
      toast.success('Bank information updated successfully');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Financial Information">
        <Card>
          <CardContent className="py-8">
            <Skeleton className="mb-4 h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer
        title="Financial Information"
        description="Failed to load bank information"
      >
        <Card>
          <CardContent className="py-8">
            <p className="text-destructive text-center text-sm">
              Failed to load bank information
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Financial Information"
      description="Manage bank account details for invoice payments"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Bank Account Details
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <CardContent className="space-y-6">
            <BankInfoForm form={form} />
          </CardContent>
          <CardFooter className="flex items-center justify-end">
            <Button onClick={handleSave} disabled={updateBankInfo.isPending}>
              {updateBankInfo.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </PageContainer>
  );
}
