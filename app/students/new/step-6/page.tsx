'use client';

import { useState, useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { WizardProgress } from '../components/wizard-progress';
import { SaveDraftButton } from '../components/save-draft-button';
import { useApplicationWizard } from '@/stores/application-wizard';
import type { Step5FinancialArrangements } from '@/lib/schemas/application-schemas';
import { Step5FinancialArrangementsSchema } from '@/lib/schemas/application-schemas';
import { usePaymentPlanTemplates } from '@/hooks/use-payment-templates';
import { useApplication } from '@/hooks/use-application';
import { usePrograms, transformProgramsForSelect } from '@/hooks/use-programs';
import { FUNCTIONS_URL, getFunctionHeaders } from '@/lib/functions';
import { DatePicker } from '@/components/ui/date-picker';
import { format, parseISO } from 'date-fns';

// =============================================================================
// STEP 5: FINANCIAL ARRANGEMENTS
// Handles payment plans and fee calculation
// =============================================================================

export default function Step5FinancialArrangements() {
  const router = useRouter();
  const { updateStep5Data, nextStep, previousStep, draftId, markDirty } = useApplicationWizard();
  const { programId: applicationProgramId } = useApplication(draftId || '');
  
  // Program selection state (fallback if no program selected in earlier steps)
  const [selectedProgramId, setSelectedProgramId] = useState<string>(applicationProgramId || '');
  const { data: programsData, isLoading: programsLoading } = usePrograms();
  const programs = transformProgramsForSelect(programsData);
  
  // Use selected program ID or fall back to application program ID
  const currentProgramId = selectedProgramId || applicationProgramId;
  
  // Form state
  const [paymentPlan, setPaymentPlan] = useState<string>('');
  const [installmentCount, setInstallmentCount] = useState<number>(1);
  const [installmentAmount, setInstallmentAmount] = useState<number>(0);

  // New payment template + anchor state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [anchor, setAnchor] = useState<'OFFER_LETTER' | 'COMMENCEMENT' | 'CUSTOM'>('OFFER_LETTER');
  const [anchorDate, setAnchorDate] = useState<string>('');
  const [derivedSchedule, setDerivedSchedule] = useState<Array<{ description: string; amount: number; dueDate: string }>>([]);
  const { data: templates, isLoading: templatesLoading, error: templatesError } = usePaymentPlanTemplates(currentProgramId || undefined);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
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
  
  // Mark store as dirty when form values change
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (type === 'change' && name) {
        markDirty();
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, markDirty]);


  // Derive schedule from backend based on selection
  const derive = async () => {
    if (!draftId || !selectedTemplateId || !currentProgramId) return;
    const res = await fetch(`${FUNCTIONS_URL}/payment-plan-templates/applications/${draftId}/derive-payment-plan`, {
      method: 'POST',
      headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: selectedTemplateId,
        anchor,
        ...(anchor === 'CUSTOM' || anchor === 'COMMENCEMENT' ? { anchorDate } : {}),
      }),
    });
    if (!res.ok) {
      console.error('Failed to derive schedule', await res.text());
      setDerivedSchedule([]);
      return;
    }
    const data = await res.json();
    const items = (data?.items ?? []) as Array<{ description: string; amount: number; dueDate: string }>;
    setDerivedSchedule(items);
  };

  useEffect(() => {
    if (selectedTemplateId) derive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, anchor, anchorDate]);
  
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
  
  const [isNavigating, setIsNavigating] = useState(false);
  const handleNext = async () => {
    setIsNavigating(true);
    await handleSubmit(onSubmit)();
    setIsNavigating(false);
  };
  
  const handlePrevious = async () => {
    previousStep();
    router.push('/students/new/step-5');
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
            {/* Program Selection (fallback if not selected in earlier steps) */}
            {!applicationProgramId && (
              <Card>
                <CardHeader>
                  <CardTitle>Program Selection</CardTitle>
                  <CardDescription>
                    Select a program to view its payment plan templates.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label>Program</Label>
                    <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                      <SelectTrigger aria-label="Select program" role="combobox" className="mt-2">
                        <SelectValue placeholder="Select a program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programsLoading && (
                          <SelectItem value="loading" disabled>Loading programs...</SelectItem>
                        )}
                        {programs.map(program => (
                          <SelectItem key={program.value} value={program.value}>
                            {program.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Payment Template & Anchor (new flow) */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Plan Template</CardTitle>
                <CardDescription>
                  Select a program-scoped template and anchor to derive the schedule. Tuition total is derived from instalments.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Template</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger aria-label="Select payment plan template" role="combobox" className="mt-2">
                        <SelectValue placeholder={currentProgramId ? 'Select a template' : 'Select a program first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {templatesLoading && (
                          <SelectItem value="loading" disabled>Loading templates...</SelectItem>
                        )}
                        {templatesError && (
                          <SelectItem value="error" disabled>Error loading templates</SelectItem>
                        )}
                        {!templatesLoading && !templatesError && (!templates || templates.length === 0) && (
                          <SelectItem value="no-templates" disabled>No templates available</SelectItem>
                        )}
                        {(templates ?? []).map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}{t.is_default ? ' (default)' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Anchor</Label>
                    <Select value={anchor} onValueChange={(v) => setAnchor(v as any)}>
                      <SelectTrigger aria-label="Select anchor" role="combobox" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OFFER_LETTER">Offer letter date</SelectItem>
                        <SelectItem value="COMMENCEMENT">Commencement date</SelectItem>
                        <SelectItem value="CUSTOM">Custom date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Anchor date</Label>
                    <div className="mt-2">
                      <DatePicker
                        value={anchorDate ? parseISO(anchorDate) : undefined}
                        onValueChange={(date) => setAnchorDate(date ? format(date, 'yyyy-MM-dd') : '')}
                        placeholder="Select anchor date"
                        dateFormat="PPP"
                        disabled={anchor === 'OFFER_LETTER'}
                        aria-label="Anchor date"
                      />
                    </div>
                    {anchor === 'COMMENCEMENT' && !anchorDate && (
                      <p className="text-xs text-muted-foreground mt-1">Provide commencement date or switch to Offer letter anchor.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Derived schedule</div>
                    <div className="text-sm">Total: {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(derivedSchedule.reduce((s, i) => s + (Number(i.amount) || 0), 0))}</div>
                  </div>
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="h-9 text-left">
                          <th className="px-3">Description</th>
                          <th className="px-3">Due date</th>
                          <th className="px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {derivedSchedule.length === 0 && (
                          <tr><td className="px-3 py-3 text-muted-foreground" colSpan={3}>Select a template and anchor to derive a schedule.</td></tr>
                        )}
                        {derivedSchedule.map((it, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">{it.description}</td>
                            <td className="px-3 py-2">{it.dueDate}</td>
                            <td className="px-3 py-2 text-right">{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(it.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
            
            {/* Legacy Payment Plan card removed per new template-driven flow */}
            
            {/* Legacy Payment Method card removed per new template-driven flow */}
            
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
              <div className="flex gap-2">
                <SaveDraftButton getFormData={() => getValues()} />
                <LoadingButton type="button" onClick={handleNext} isLoading={isNavigating} loadingText="Reviewing...">
                  Review Application
                </LoadingButton>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
