'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useApplicationWizard } from '@/stores/application-wizard';
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// SAVE DRAFT BUTTON COMPONENT
// Reusable button for saving drafts manually in the application wizard
// Follows ShadCN design system with proper state management
// =============================================================================

interface SaveDraftButtonProps {
  /** Whether the button should be disabled (e.g., when no changes since last save) */
  disabled?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Size variant for the button */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Whether to show icon */
  showIcon?: boolean;
  /** Callback to get current form data for saving */
  getFormData?: () => any;
}

export const SaveDraftButton = ({ 
  disabled = false, 
  className = '',
  size = 'default',
  showIcon = true,
  getFormData
}: SaveDraftButtonProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const { 
    createDraft, 
    saveDraft, 
    draftId, 
    formData, 
    isDirty,
    markClean,
    updateFormData
  } = useApplicationWizard();

  const handleSaveDraft = async () => {
    if (disabled || isSaving) return;

    setIsSaving(true);
    try {
      let currentDraftId = draftId;

      // Update form data if callback provided (do this FIRST)
      if (getFormData) {
        const currentFormData = getFormData();
        updateFormData(currentFormData);
      }

      // Create draft if it doesn't exist
      if (!currentDraftId) {
        currentDraftId = await createDraft();
      }

      // Save the current form data
      await saveDraft();
      
      // Mark as clean since we just saved
      markClean();
      
      // No success toast as per requirements - button will be disabled
      
    } catch (error: any) {
      console.error('Failed to save draft:', error);
      toast.error('Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Button is disabled if:
  // 1. Explicitly disabled prop
  // 2. Currently saving
  // 3. No changes since last save (not dirty)
  const isButtonDisabled = disabled || isSaving || !isDirty;

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={isButtonDisabled}
      onClick={handleSaveDraft}
      className={className}
    >
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          {showIcon && <Save className="h-4 w-4" />}
          Save Draft
        </>
      )}
    </Button>
  );
};
