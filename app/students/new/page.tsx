'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WizardProgress } from './components/wizard-progress';
import { useApplicationWizard, useUnsavedChangesWarning } from '@/stores/application-wizard';
import { clearApplicationWizardStorage } from '@/lib/utils';
import { UnsavedChangesDialog } from './components/unsaved-changes-dialog';
import { useState } from 'react';

// =============================================================================
// NEW APPLICATION WIZARD CONTAINER
// Main container that handles wizard state and navigation
// =============================================================================

export default function NewApplicationWizard() {
  const router = useRouter();
  const { currentStep, draftId, loadDraft, isDirty } = useApplicationWizard();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  
  // Enable unsaved changes warning
  useUnsavedChangesWarning();
  
  // Load existing draft if it exists (no automatic creation)
  useEffect(() => {
    const isUuidLike = /^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
    if (draftId && isUuidLike.test(draftId)) {
      // Hydrate formData from server on app mount
      loadDraft(draftId).catch((error) => {
        console.error('Failed to load draft:', error);
        // Could show a toast here if needed
      });
    }
  }, [draftId, loadDraft]);

  // If user navigates to New Application afresh via sidebar, clear any old wizard storage first
  useEffect(() => {
    clearApplicationWizardStorage();
  }, []);
  
  // Redirect to current step (no need to wait for draftId since we don't auto-create)
  useEffect(() => {
    const stepPath = `/students/new/step-${currentStep}`;
    if (currentStep === 7) {
      router.replace('/students/new/review');
    } else {
      router.replace(stepPath);
    }
  }, [currentStep, router]);
  
  const handleConfirmLeave = () => {
    // User confirmed they want to leave without saving
    router.push('/students/applications');
  };

  const handleCancelLeave = () => {
    // User cancelled - stay on current page
    setShowUnsavedDialog(false);
  };

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
      
      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onConfirmLeave={handleConfirmLeave}
        onCancel={handleCancelLeave}
      />
    </div>
  );
}
