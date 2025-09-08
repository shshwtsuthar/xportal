'use client';

import { usePathname } from 'next/navigation';

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
  const pathname = usePathname();
  const index = steps.findIndex(s => pathname.startsWith(s.path));
  const currentIndex = index >= 0 ? index : 0;
  const progress = Math.max(0, Math.min(100, (currentIndex / (steps.length - 1)) * 100));
  return (
    <div className="sticky top-0 h-1 bg-transparent z-10">
      <div
        className="h-1 bg-black dark:bg-white transition-all duration-300 ease-in-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
