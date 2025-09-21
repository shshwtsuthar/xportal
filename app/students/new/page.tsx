'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardProgress } from './components/wizard-progress';
import { useApplicationWizard, useUnsavedChangesWarning } from '@/stores/application-wizard';
import { clearApplicationWizardStorage } from '@/lib/utils';
import { UnsavedChangesDialog } from './components/unsaved-changes-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// =============================================================================
// NEW APPLICATION WIZARD CONTAINER
// Main container that handles wizard state and navigation
// =============================================================================

export default function NewApplicationWizard() {
  const router = useRouter();
  const { currentStep, draftId, loadDraft, createDraft, setCurrentStep, resetWizard, isDirty, isLoading } = useApplicationWizard();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [draftCreationError, setDraftCreationError] = useState<string | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  
  // Enable unsaved changes warning
  useUnsavedChangesWarning();
  
  // Create draft immediately when component mounts
  useEffect(() => {
    const initializeDraft = async () => {
      console.log('[NEW_APPLICATION] Starting fresh application...');
      
      // Clear any existing storage first
      clearApplicationWizardStorage();
      console.log('[NEW_APPLICATION] Cleared localStorage');
      
      // Reset wizard state to ensure clean start
      resetWizard();
      console.log('[NEW_APPLICATION] Reset wizard state');
      
      // ALWAYS create a new draft - never load existing ones
      await createNewDraft();
    };

    initializeDraft();
  }, []);

  const createNewDraft = async () => {
    setIsCreatingDraft(true);
    setDraftCreationError(null);
    
    try {
      // Reset to step 1 when creating a new draft
      setCurrentStep(1);
      console.log('[NEW_DRAFT] Creating new draft...');
      const newDraftId = await createDraft();
      console.log('[NEW_DRAFT] Draft created successfully with ID:', newDraftId);
    } catch (error) {
      console.error('[NEW_DRAFT] Failed to create draft:', error);
      setDraftCreationError(
        error instanceof Error 
          ? error.message 
          : 'Failed to create application draft. Please try again.'
      );
    } finally {
      setIsCreatingDraft(false);
    }
  };
  
  // Redirect to current step once we have a draft
  useEffect(() => {
    if (draftId && !isCreatingDraft && !draftCreationError) {
      const stepPath = `/students/new/step-${currentStep}`;
      if (currentStep === 7) {
        router.replace('/students/new/review');
      } else {
        router.replace(stepPath);
      }
    }
  }, [currentStep, router, draftId, isCreatingDraft, draftCreationError]);
  
  const handleConfirmLeave = () => {
    // User confirmed they want to leave without saving
    router.push('/students/applications');
  };

  const handleCancelLeave = () => {
    // User cancelled - stay on current page
    setShowUnsavedDialog(false);
  };

  // Show error state if draft creation failed
  if (draftCreationError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-card rounded-lg shadow-sm border border-border p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <p className="font-semibold">Failed to create application draft</p>
                  <p>{draftCreationError}</p>
                  <button
                    onClick={createNewDraft}
                    disabled={isCreatingDraft}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {isCreatingDraft ? 'Retrying...' : 'Try Again'}
                  </button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

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
            <span className="ml-3 text-muted-foreground">
              {isCreatingDraft ? 'Creating draft...' : 'Initializing application...'}
            </span>
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
