'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WizardProgress } from './components/wizard-progress';
import { useApplicationWizard } from '@/stores/application-wizard';
import { clearApplicationWizardStorage } from '@/lib/utils';

// =============================================================================
// NEW APPLICATION WIZARD CONTAINER
// Main container that handles wizard state and navigation
// =============================================================================

export default function NewApplicationWizard() {
  const router = useRouter();
  const { currentStep, createDraft, draftId } = useApplicationWizard();
  
  // Create draft on mount if it doesn't exist or is invalid (legacy non-UUID)
  useEffect(() => {
    const isUuidLike = /^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
    if (!draftId || !isUuidLike.test(draftId)) {
      createDraft().catch(console.error);
    }
  }, [draftId, createDraft]);

  // If user navigates to New Application afresh via sidebar, clear any old wizard storage first
  useEffect(() => {
    clearApplicationWizardStorage();
  }, []);
  
  // Redirect to current step only after we have a valid draftId
  useEffect(() => {
    if (!draftId) return;
    const stepPath = `/students/new/step-${currentStep}`;
    if (currentStep === 6) {
      router.replace('/students/new/review');
    } else {
      router.replace(stepPath);
    }
  }, [currentStep, router, draftId]);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Progress Indicator - Non-overlapping with sidebar */}
      <WizardProgress />
      
      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8">
          {/* Loading State */}
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            <span className="ml-3 text-muted-foreground">Initializing draft...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
