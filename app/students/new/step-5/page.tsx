'use client';

import { useState, useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { WizardProgress } from '../components/wizard-progress';
import { useApplicationWizard } from '@/stores/application-wizard';
import type { Step5FinancialArrangements } from '@/lib/schemas/application-schemas';
import { Step5FinancialArrangementsSchema } from '@/lib/schemas/application-schemas';
import { useAutosave } from '@/hooks/use-autosave';

// =============================================================================
// STEP 5: FINANCIAL ARRANGEMENTS
// Handles payment plans and fee calculation
// =============================================================================

export default function Step5FinancialArrangements() {
  const router = useRouter();
  const { updateStep5Data, nextStep, previousStep, draftId } = useApplicationWizard();
  
  // Form state
  const [paymentPlan, setPaymentPlan] = useState<string>('');
  const [installmentCount, setInstallmentCount] = useState<number>(1);
  const [installmentAmount, setInstallmentAmount] = useState<number>(0);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<Step5FinancialArrangements>({
    defaultValues: {
      financialArrangements: {
        paymentPlan: 'full-upfront',
        tuitionFeeSnapshot: 0,
        agentCommissionRateSnapshot: 0,
        paymentMethod: 'credit-card',
        installmentCount: 1,
        installmentAmount: 0,
        paymentSchedule: [],
        specialArrangements: '',
        financialNotes: '',
      },
    },
  });
  
  const watchedValues = watch();

  // Autosave draft (Step 5)
  const { schedule, saveNow } = useAutosave({
    applicationId: draftId || '',
    enabled: Boolean(draftId),
    debounceMs: 1500,
    getPayload: () => ({
      financialArrangements: watchedValues.financialArrangements,
    }),
  });

  useEffect(() => {
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedValues.financialArrangements)]);
  
  // Calculate installment amount when payment plan or tuition fee changes
  useEffect(() => {
    const tuitionFee = watchedValues.financialArrangements?.tuitionFeeSnapshot || 0;
    const plan = watchedValues.financialArrangements?.paymentPlan;
    const count = watchedValues.financialArrangements?.installmentCount || 1;
    
    if (plan === 'installments' && count > 0) {
      const amount = tuitionFee / count;
      setInstallmentAmount(amount);
      setValue('financialArrangements.installmentAmount', amount);
    } else if (plan === 'full-upfront') {
      setInstallmentAmount(tuitionFee);
      setValue('financialArrangements.installmentAmount', tuitionFee);
    }
  }, [
    watchedValues.financialArrangements?.paymentPlan,
    watchedValues.financialArrangements?.tuitionFeeSnapshot,
    watchedValues.financialArrangements?.installmentCount,
    setValue
  ]);
  
  // Generate payment schedule for installments
  useEffect(() => {
    const plan = watchedValues.financialArrangements?.paymentPlan;
    const count = watchedValues.financialArrangements?.installmentCount || 1;
    const amount = watchedValues.financialArrangements?.installmentAmount || 0;
    
    if (plan === 'installments' && count > 1) {
      const schedule = [];
      const today = new Date();
      
      for (let i = 0; i < count; i++) {
        const dueDate = new Date(today);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        schedule.push({
          dueDate: dueDate.toISOString().split('T')[0],
          amount: amount,
          status: 'pending' as const,
        });
      }
      
      setValue('financialArrangements.paymentSchedule', schedule);
    } else {
      setValue('financialArrangements.paymentSchedule', []);
    }
  }, [
    watchedValues.financialArrangements?.paymentPlan,
    watchedValues.financialArrangements?.installmentCount,
    watchedValues.financialArrangements?.installmentAmount,
    setValue
  ]);
  
  const onSubmit: SubmitHandler<Step5FinancialArrangements> = async (data) => {
    try {
      // Update wizard state
      updateStep5Data(data);
      
      // Move to next step
      nextStep();
      
      // Navigate to review step
      router.push('/students/new/review');
    } catch (error) {
      console.error('Error submitting step 5:', error);
    }
  };
  
  const handleNext = async () => {
    await saveNow();
    handleSubmit(onSubmit)();
  };
  
  const handlePrevious = async () => {
    await saveNow();
    previousStep();
    router.push('/students/new/step-4');
  };
  
  const handlePaymentPlanChange = (plan: string) => {
    setPaymentPlan(plan);
    setValue('financialArrangements.paymentPlan', plan as any);
    
    if (plan === 'full-upfront') {
      setInstallmentCount(1);
      setValue('financialArrangements.installmentCount', 1);
    }
  };
  
  const handleInstallmentCountChange = (count: number) => {
    setInstallmentCount(count);
    setValue('financialArrangements.installmentCount', count);
  };

  const formatCurrency = (value: number) => {
    if (isNaN(value)) return '';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 }).format(value);
  };

  const handleTuitionBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const num = Number(e.target.value);
    if (!isNaN(num)) {
      setValue('financialArrangements.tuitionFeeSnapshot', Number(num.toFixed(2)));
      e.currentTarget.value = String(Number(num.toFixed(2)));
    }
  };

  const handleCommissionBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const num = Number(e.target.value);
    if (!isNaN(num)) {
      setValue('financialArrangements.agentCommissionRateSnapshot', Number(num.toFixed(2)));
      e.currentTarget.value = String(Number(num.toFixed(2)));
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Progress Indicator */}
      <WizardProgress />
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">Financial Arrangements</h1>
            <p className="mt-2 text-muted-foreground">Staff: record payment plan and financial arrangements discussed with the client.</p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Tuition Fee */}
            <Card>
              <CardHeader>
                <CardTitle>Tuition Fee</CardTitle>
                <CardDescription>
                  Enter the total tuition fee agreed for this enrolment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="tuitionFee">Total Tuition Fee (AUD) *</Label>
                  <Input
                    id="tuitionFee"
                    type="number"
                    step="0.01"
                    min="0"
                    aria-label="Total tuition fee in AUD"
                    placeholder="e.g., 10000"
                    {...register('financialArrangements.tuitionFeeSnapshot', { valueAsNumber: true })}
                    className={`mt-2 ${errors.financialArrangements?.tuitionFeeSnapshot ? 'border-red-500' : ''}`}
                    onBlur={handleTuitionBlur}
                  />
                  {errors.financialArrangements?.tuitionFeeSnapshot && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.financialArrangements.tuitionFeeSnapshot.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Agent Commission */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Commission</CardTitle>
                <CardDescription>
                  Commission rate for the agent (if applicable)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="agentCommission">Agent Commission Rate (%)</Label>
                  <Input
                    id="agentCommission"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    aria-label="Agent commission rate in percent"
                    placeholder="e.g., 10"
                    {...register('financialArrangements.agentCommissionRateSnapshot', { valueAsNumber: true })}
                    className={`mt-2 ${errors.financialArrangements?.agentCommissionRateSnapshot ? 'border-red-500' : ''}`}
                    onBlur={handleCommissionBlur}
                  />
                  {errors.financialArrangements?.agentCommissionRateSnapshot && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.financialArrangements.agentCommissionRateSnapshot.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Payment Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Plan</CardTitle>
                <CardDescription>
                  Select how the tuition fees will be paid
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="paymentPlan">Payment Plan</Label>
                  <Select onValueChange={handlePaymentPlanChange}>
                    <SelectTrigger aria-label="Payment Plan" role="combobox" className="mt-2">
                      <SelectValue placeholder="Select payment plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-upfront">Full Upfront Payment</SelectItem>
                      <SelectItem value="installments">Installment Payments</SelectItem>
                      <SelectItem value="deferred">Deferred Payment</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.financialArrangements?.paymentPlan && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.financialArrangements.paymentPlan.message}
                    </p>
                  )}
                </div>
                
                {paymentPlan === 'installments' && (
                  <div>
                    <Label htmlFor="installmentCount">Number of Installments</Label>
                    <Select onValueChange={(value) => handleInstallmentCountChange(parseInt(value))}>
                      <SelectTrigger aria-label="Installment Count" role="combobox" className="mt-2">
                        <SelectValue placeholder="Select number of installments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 Installments</SelectItem>
                        <SelectItem value="3">3 Installments</SelectItem>
                        <SelectItem value="4">4 Installments</SelectItem>
                        <SelectItem value="6">6 Installments</SelectItem>
                        <SelectItem value="12">12 Installments</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.financialArrangements?.installmentCount && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.financialArrangements.installmentCount.message}
                      </p>
                    )}
                  </div>
                )}
                
                {installmentAmount > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Payment Amount:</span>
                      <span className="text-lg font-bold text-foreground">
                        ${installmentAmount.toFixed(2)} AUD
                      </span>
                    </div>
                    {paymentPlan === 'installments' && installmentCount > 1 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {installmentCount} payments of ${installmentAmount.toFixed(2)} AUD each
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Select the payment method
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select onValueChange={(value) => setValue('financialArrangements.paymentMethod', value as any)}>
                    <SelectTrigger aria-label="Payment Method" role="combobox" className="mt-2">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit-card">Credit Card</SelectItem>
                      <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.financialArrangements?.paymentMethod && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.financialArrangements.paymentMethod.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Payment Schedule */}
            {watchedValues.financialArrangements?.paymentSchedule && 
             watchedValues.financialArrangements.paymentSchedule.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Schedule</CardTitle>
                  <CardDescription>
                    Payment schedule breakdown
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {watchedValues.financialArrangements.paymentSchedule.map((payment, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <span className="font-medium">Payment {index + 1}</span>
                          <div className="text-sm text-muted-foreground">
                            Due: {new Date(payment.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="outline">
                          ${payment.amount.toFixed(2)} AUD
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Special Arrangements */}
            <Card>
              <CardHeader>
                <CardTitle>Special Arrangements</CardTitle>
                <CardDescription>
                  Any special financial arrangements or considerations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="specialArrangements">Special Arrangements</Label>
                  <Textarea
                    id="specialArrangements"
                    {...register('financialArrangements.specialArrangements')}
                    placeholder="Please describe any special financial arrangements..."
                    rows={3}
                    className={`mt-2 ${errors.financialArrangements?.specialArrangements ? 'border-red-500' : ''}`}
                  />
                  {errors.financialArrangements?.specialArrangements && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.financialArrangements.specialArrangements.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Financial Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
                <CardDescription>
                  Any additional financial notes or comments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="financialNotes">Financial Notes</Label>
                  <Textarea
                    id="financialNotes"
                    {...register('financialArrangements.financialNotes')}
                    placeholder="Please provide any additional financial notes..."
                    rows={3}
                    className={`mt-2 ${errors.financialArrangements?.financialNotes ? 'border-red-500' : ''}`}
                  />
                  {errors.financialArrangements?.financialNotes && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.financialArrangements.financialNotes.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>
                  Review financial arrangements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Total Tuition Fee:</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(Number(watchedValues.financialArrangements?.tuitionFeeSnapshot ?? 0))}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Payment Plan:</span>
                  <span className="text-muted-foreground">
                    {watchedValues.financialArrangements?.paymentPlan?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not selected'}
                  </span>
                </div>
                
                {watchedValues.financialArrangements?.paymentPlan === 'installments' && (
                  <div className="flex justify-between">
                    <span className="font-medium">Installments:</span>
                    <span className="text-muted-foreground">
                      {watchedValues.financialArrangements?.installmentCount} payments
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="font-medium">Payment Method:</span>
                  <span className="text-muted-foreground">
                    {watchedValues.financialArrangements?.paymentMethod?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not selected'}
                  </span>
                </div>
                
                {watchedValues.financialArrangements?.agentCommissionRateSnapshot && (
                  <div className="flex justify-between">
                    <span className="font-medium">Agent Commission:</span>
                    <span className="text-muted-foreground">
                      {watchedValues.financialArrangements.agentCommissionRateSnapshot}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Navigation */}
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handlePrevious}>
                Previous Step
              </Button>
              <Button type="button" onClick={handleNext}>
                Review Application
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
