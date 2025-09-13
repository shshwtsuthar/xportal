'use client';

import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { WizardProgress } from '../components/wizard-progress';
import { useApplicationWizard } from '@/stores/application-wizard';
import type { Step4AgentReferral } from '@/lib/schemas/application-schemas';
import { Step4AgentReferralSchema } from '@/lib/schemas/application-schemas';
import { useAgents, transformAgentsForSelect } from '@/hooks/use-agents';
import { useAutosave } from '@/hooks/use-autosave';
import { useEffect } from 'react';

// =============================================================================
// STEP 4: AGENT & REFERRAL
// Handles agent selection and marketing attribution
// =============================================================================

export default function Step4AgentReferral() {
  const router = useRouter();
  const { updateStep4Data, nextStep, previousStep, draftId, formData } = useApplicationWizard();
  
  // Agents query
  const { data: agentsData, isLoading: agentsLoading } = useAgents();
  const agents = transformAgentsForSelect(agentsData);
  
  // Form state
  const [hasAgent, setHasAgent] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<Step4AgentReferral>({
    // Keep runtime field type checks, but do not block Next step
    // resolver: zodResolver(Step4AgentReferralSchema) as any,
    defaultValues: {
      agentReferral: {
        agentId: (formData as any)?.agentId ?? null,
        referralSource: (formData as any)?.referralSource ?? '',
        marketingAttribution: (formData as any)?.marketingAttribution ?? '',
        referralNotes: (formData as any)?.referralNotes ?? '',
      },
    },
  });
  
  const watchedValues = watch();

  // Autosave draft (Step 4)
  const { schedule, saveNow } = useAutosave({
    applicationId: draftId || '',
    enabled: Boolean(draftId),
    debounceMs: 1500,
    getPayload: () => ({
      agentId: watchedValues.agentReferral?.agentId ?? null,
    }),
  });

  useEffect(() => {
    schedule();
  }, [watchedValues.agentReferral?.agentId]);

  // Hydrate when formData changes
  useEffect(() => {
    setValue('agentReferral.agentId', (formData as any)?.agentId ?? null);
    setValue('agentReferral.referralSource', (formData as any)?.referralSource ?? '');
    setValue('agentReferral.marketingAttribution', (formData as any)?.marketingAttribution ?? '');
    setValue('agentReferral.referralNotes', (formData as any)?.referralNotes ?? '');
    setHasAgent(Boolean((formData as any)?.agentId));
  }, [formData, setValue]);
  
  const onSubmit: SubmitHandler<Step4AgentReferral> = async (data) => {
    try {
      // Update wizard state
      updateStep4Data(data);
      
      // Move to next step
      nextStep();
      
      // Navigate to step 5
      router.push('/students/new/step-6');
    } catch (error) {
      console.error('Error submitting step 4:', error);
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
  
  const handleAgentSelection = (agentId: string) => {
    if (agentId === 'none') {
      setHasAgent(false);
      setValue('agentReferral.agentId', null);
    } else {
      setHasAgent(true);
      setValue('agentReferral.agentId', agentId);
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
            <h1 className="text-3xl font-bold text-foreground">Agent & Referral</h1>
            <p className="mt-2 text-muted-foreground">Staff: record agent representation and referral details if applicable.</p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Agent Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Representation</CardTitle>
                <CardDescription>
                  Is the applicant represented by an educational agent?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasAgent"
                    checked={hasAgent}
                    onCheckedChange={(checked) => {
                      setHasAgent(checked as boolean);
                      if (!checked) {
                        setValue('agentReferral.agentId', null);
                      }
                    }}
                  />
                  <Label htmlFor="hasAgent">
                    Applicant is represented by an educational agent
                  </Label>
                </div>
                
                {hasAgent && (
                  <div>
                    <Label htmlFor="agent">Select Agent</Label>
                    <Select onValueChange={handleAgentSelection}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No agent selected</SelectItem>
                        {agentsLoading ? (
                          <SelectItem value="loading-agents" disabled>Loading agents...</SelectItem>
                        ) : (
                          agents.map((agent) => (
                            <SelectItem key={agent.value} value={agent.value}>
                              <div className="flex flex-col">
                                <span>{agent.label}</span>
                                {agent.description && (
                                  <span className="text-sm text-muted-foreground">
                                    {agent.description}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {errors.agentReferral?.agentId && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.agentReferral.agentId.message}
                      </p>
                    )}
                    
                    {watchedValues.agentReferral?.agentId && (
                      <div className="mt-3">
                        <Label>Selected Agent:</Label>
                        <div className="mt-1">
                          {(() => {
                            const selectedAgent = agents.find(a => a.value === watchedValues.agentReferral?.agentId);
                            return selectedAgent ? (
                              <Badge variant="default" className="text-sm">
                                {selectedAgent.label}
                                {selectedAgent.description && (
                                  <span className="ml-2 text-muted-foreground">
                                    - {selectedAgent.description}
                                  </span>
                                )}
                              </Badge>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            
            
            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>
                  Any additional notes about the referral or agent representation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="referralNotes">Referral Notes</Label>
                  <Textarea
                    id="referralNotes"
                    {...register('agentReferral.referralNotes')}
                    placeholder="Provide any additional information about how the applicant heard about the institution or agent representation..."
                    rows={4}
                    className={(errors.agentReferral?.referralNotes ? 'border-red-500 ' : '') + 'mt-2'}
                  />
                  {errors.agentReferral?.referralNotes && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.agentReferral.referralNotes.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>
                  Review the agent and referral information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Agent Representation:</span>
                  <span className="text-muted-foreground">
                    {hasAgent ? 'Yes' : 'No'}
                  </span>
                </div>
                
                {hasAgent && watchedValues.agentReferral?.agentId && (
                  <div className="flex justify-between">
                    <span className="font-medium">Selected Agent:</span>
                    <span className="text-muted-foreground">
                      {agents.find(a => a.value === watchedValues.agentReferral?.agentId)?.label || 'Not selected'}
                    </span>
                  </div>
                )}
                
                {watchedValues.agentReferral?.referralSource && (
                  <div className="flex justify-between">
                    <span className="font-medium">Referral Source:</span>
                    <span className="text-muted-foreground">
                      {watchedValues.agentReferral.referralSource}
                    </span>
                  </div>
                )}
                
                {watchedValues.agentReferral?.marketingAttribution && (
                  <div className="flex justify-between">
                    <span className="font-medium">Marketing Attribution:</span>
                    <span className="text-muted-foreground">
                      {watchedValues.agentReferral.marketingAttribution}
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
                Next Step
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
