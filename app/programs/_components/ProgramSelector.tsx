"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  programs: any[];
  selectedProgramId: string;
  onProgramSelect: (id: string) => void;
  placeholder?: string;
};

export const ProgramSelector = ({ programs, selectedProgramId, onProgramSelect, placeholder = "Select program" }: Props) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Program</label>
      <Select value={selectedProgramId} onValueChange={onProgramSelect}>
        <SelectTrigger className="min-w-[340px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {programs?.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.programCode} - {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};


