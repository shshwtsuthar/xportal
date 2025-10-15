'use client';

import { useState } from 'react';
import { Tables } from '@/database.types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useSendOfferLetter } from '@/src/hooks/useSendOfferLetter';
import { toast } from 'sonner';

type Props = {
  application: Tables<'applications'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SendOfferDialog({ application, open, onOpenChange }: Props) {
  const [recipient, setRecipient] = useState<'student' | 'agent'>('student');
  const sendOfferMutation = useSendOfferLetter();

  const handleSend = async () => {
    try {
      await sendOfferMutation.mutateAsync({
        applicationId: application.id,
        recipient,
      });

      toast.success('Offer letter sent successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error(
        `Failed to send offer letter: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const studentEmail = application.email;
  const agentEmail = application.agent_id ? 'Agent email available' : null;
  const isAgentDisabled = !application.agent_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Offer Letter</DialogTitle>
          <DialogDescription>
            Choose who should receive the offer letter for{' '}
            {[application.first_name, application.last_name]
              .filter(Boolean)
              .join(' ') || 'this student'}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={recipient}
            onValueChange={(value) =>
              setRecipient(value as 'student' | 'agent')
            }
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="student" id="student" />
              <Label htmlFor="student" className="flex flex-col">
                <span className="font-medium">Send to Student</span>
                <span className="text-muted-foreground text-sm">
                  {studentEmail || 'No email address available'}
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="agent"
                id="agent"
                disabled={isAgentDisabled}
              />
              <Label
                htmlFor="agent"
                className={`flex flex-col ${isAgentDisabled ? 'text-muted-foreground' : ''}`}
              >
                <span className="font-medium">
                  Send to Agent
                  {isAgentDisabled && ' (Not Available)'}
                </span>
                <span className="text-muted-foreground text-sm">
                  {isAgentDisabled
                    ? 'No agent assigned to this application'
                    : agentEmail || 'Agent email not available'}
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendOfferMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              sendOfferMutation.isPending ||
              (recipient === 'student' && !studentEmail) ||
              (recipient === 'agent' && isAgentDisabled)
            }
          >
            {sendOfferMutation.isPending ? 'Sending...' : 'Send Offer Letter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
