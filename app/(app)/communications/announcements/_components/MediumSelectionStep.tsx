'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { AnnouncementMedium } from '@/types/announcementFilters';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Props = {
  selection: AnnouncementMedium[];
  onSelectionChange: (selection: AnnouncementMedium[]) => void;
};

export function MediumSelectionStep({ selection, onSelectionChange }: Props) {
  const mediums: { id: AnnouncementMedium; label: string; enabled: boolean }[] =
    [
      { id: 'announcement', label: 'Announcement', enabled: true },
      { id: 'sms', label: 'SMS', enabled: false },
      { id: 'mail', label: 'Mail', enabled: false },
      { id: 'whatsapp', label: 'WhatsApp', enabled: false },
    ];

  const handleToggle = (medium: AnnouncementMedium, checked: boolean) => {
    if (!mediums.find((m) => m.id === medium)?.enabled) {
      return; // Don't allow toggling disabled mediums
    }

    if (checked) {
      if (!selection.includes(medium)) {
        onSelectionChange([...selection, medium]);
      }
    } else {
      onSelectionChange(selection.filter((m) => m !== medium));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">
          Select Delivery Mediums
        </Label>
        <p className="text-muted-foreground mt-1 text-sm">
          Choose where to send this announcement. Only enabled options are
          functional.
        </p>
      </div>

      <div className="space-y-3">
        {mediums.map((medium) => {
          const isChecked = selection.includes(medium.id);
          const isEnabled = medium.enabled;

          const checkbox = (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={medium.id}
                checked={isChecked}
                onCheckedChange={(checked) =>
                  handleToggle(medium.id, checked as boolean)
                }
                disabled={!isEnabled}
                aria-label={medium.label}
              />
              <Label
                htmlFor={medium.id}
                className={`font-normal ${!isEnabled ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {medium.label}
              </Label>
            </div>
          );

          if (!isEnabled) {
            return (
              <TooltipProvider key={medium.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>{checkbox}</div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Coming soon</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return <div key={medium.id}>{checkbox}</div>;
        })}
      </div>

      {selection.length === 0 && (
        <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-3">
          <p className="text-destructive text-sm font-medium">
            Please select at least one delivery medium.
          </p>
        </div>
      )}
    </div>
  );
}
