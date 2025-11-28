'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RecipientFilterStep } from './RecipientFilterStep';
import { MediumSelectionStep } from './MediumSelectionStep';
import { ContentStep } from './ContentStep';
import { useCreateAnnouncement } from '@/src/hooks/useCreateAnnouncement';
import { toast } from 'sonner';
import type {
  AnnouncementFilterCriteria,
  AnnouncementMedium,
} from '@/types/announcementFilters';

const steps = [
  { id: 1, label: 'Recipients' },
  { id: 2, label: 'Medium' },
  { id: 3, label: 'Content' },
];

type StepData = {
  recipientFilterCriteria: AnnouncementFilterCriteria | null;
  mediumSelection: AnnouncementMedium[];
  subject: string;
  body: string;
  attachments: File[];
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  tags: string[];
  expiryDate: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewAnnouncementDialog({ open, onOpenChange }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [stepData, setStepData] = useState<StepData>({
    recipientFilterCriteria: null,
    mediumSelection: [],
    subject: '',
    body: '',
    attachments: [],
    priority: 'NORMAL',
    tags: [],
    expiryDate: '',
  });

  const { mutateAsync: createAnnouncement, isPending } =
    useCreateAnnouncement();

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!stepData.recipientFilterCriteria) {
      toast.error('Please select recipients');
      return;
    }

    if (stepData.mediumSelection.length === 0) {
      toast.error('Please select at least one medium');
      return;
    }

    if (!stepData.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    if (!stepData.body.trim()) {
      toast.error('Please enter a body');
      return;
    }

    try {
      await createAnnouncement({
        subject: stepData.subject,
        body: stepData.body,
        recipientFilterCriteria: stepData.recipientFilterCriteria,
        mediumSelection: stepData.mediumSelection,
        priority: stepData.priority,
        tags: stepData.tags,
        expiryDate: stepData.expiryDate || undefined,
        attachments:
          stepData.attachments.length > 0 ? stepData.attachments : undefined,
      });

      toast.success('Announcement sent successfully!');
      onOpenChange(false);
      // Reset form
      setActiveStep(0);
      setStepData({
        recipientFilterCriteria: null,
        mediumSelection: [],
        subject: '',
        body: '',
        attachments: [],
        priority: 'NORMAL',
        tags: [],
        expiryDate: '',
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to send announcement'
      );
    }
  };

  const canProceed = () => {
    if (activeStep === 0) {
      return stepData.recipientFilterCriteria !== null;
    }
    if (activeStep === 1) {
      return stepData.mediumSelection.length > 0;
    }
    if (activeStep === 2) {
      return (
        stepData.subject.trim().length > 0 && stepData.body.trim().length > 0
      );
    }
    return false;
  };

  const handleClose = (open: boolean) => {
    if (!open && !isPending) {
      // Reset form when closing
      setActiveStep(0);
      setStepData({
        recipientFilterCriteria: null,
        mediumSelection: [],
        subject: '',
        body: '',
        attachments: [],
        priority: 'NORMAL',
        tags: [],
        expiryDate: '',
      });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send New Announcement</DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 border-b pb-4">
          {steps.map((step, index) => (
            <Button
              key={step.id}
              size="sm"
              variant={index === activeStep ? 'default' : 'outline'}
              onClick={() => setActiveStep(index)}
              aria-label={`Go to ${step.label}`}
              disabled={isPending}
            >
              {step.label}
            </Button>
          ))}
        </div>

        {/* Step content */}
        <div className="py-4">
          {activeStep === 0 && (
            <RecipientFilterStep
              criteria={stepData.recipientFilterCriteria}
              onCriteriaChange={(criteria) =>
                setStepData((prev) => ({
                  ...prev,
                  recipientFilterCriteria: criteria,
                }))
              }
            />
          )}
          {activeStep === 1 && (
            <MediumSelectionStep
              selection={stepData.mediumSelection}
              onSelectionChange={(selection) =>
                setStepData((prev) => ({
                  ...prev,
                  mediumSelection: selection,
                }))
              }
            />
          )}
          {activeStep === 2 && (
            <ContentStep
              subject={stepData.subject}
              body={stepData.body}
              attachments={stepData.attachments}
              priority={stepData.priority}
              tags={stepData.tags}
              expiryDate={stepData.expiryDate}
              onSubjectChange={(subject) =>
                setStepData((prev) => ({ ...prev, subject }))
              }
              onBodyChange={(body) =>
                setStepData((prev) => ({ ...prev, body }))
              }
              onAttachmentsChange={(attachments) =>
                setStepData((prev) => ({ ...prev, attachments }))
              }
              onPriorityChange={(priority) =>
                setStepData((prev) => ({ ...prev, priority }))
              }
              onTagsChange={(tags) =>
                setStepData((prev) => ({ ...prev, tags }))
              }
              onExpiryDateChange={(expiryDate) =>
                setStepData((prev) => ({ ...prev, expiryDate }))
              }
            />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between border-t pt-4">
          <div>
            {activeStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isPending}
                aria-label="Previous step"
              >
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {activeStep < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isPending}
                aria-label="Next step"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isPending}
                aria-label="Send announcement"
              >
                {isPending ? 'Sending...' : 'Send'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
