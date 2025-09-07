'use client';

import { useApplicationWizard } from '@/stores/application-wizard';
import { cn } from '@/lib/utils';

// =============================================================================
// WIZARD PROGRESS COMPONENT
// Non-overlapping progress indicator at the top of the wizard
// =============================================================================

const steps = [
  { id: 1, title: 'Personal Info', path: '/students/new/step-1' },
  { id: 2, title: 'Academic Info', path: '/students/new/step-2' },
  { id: 3, title: 'Program Selection', path: '/students/new/step-3' },
  { id: 4, title: 'Agent & Referral', path: '/students/new/step-4' },
  { id: 5, title: 'Financial', path: '/students/new/step-5' },
  { id: 6, title: 'Review', path: '/students/new/review' },
];

export const WizardProgress = () => {
  const { currentStep, totalSteps } = useApplicationWizard();
  const progress = Math.max(0, Math.min(100, ((currentStep - 1) / (totalSteps - 1)) * 100));
  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-transparent z-50">
      <div
        className="h-1 bg-black dark:bg-white transition-all duration-300 ease-in-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
