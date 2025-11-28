'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetAgents } from '@/src/hooks/useGetAgents';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
import { useComputeRecipientCount } from '@/src/hooks/useComputeRecipientCount';
import type {
  AnnouncementFilterCriteria,
  ApplicationFilterCriteria,
  StudentFilterCriteria,
} from '@/types/announcementFilters';
import { Badge } from '@/components/ui/badge';

type Props = {
  criteria: AnnouncementFilterCriteria | null;
  onCriteriaChange: (criteria: AnnouncementFilterCriteria) => void;
};

export function RecipientFilterStep({ criteria, onCriteriaChange }: Props) {
  const [recipientType, setRecipientType] = useState<
    'students' | 'applications'
  >(criteria?.recipientType || 'students');

  // Application filters
  const [agentIds, setAgentIds] = useState<string[]>(() => {
    if (criteria?.recipientType === 'applications') {
      const appFilters = criteria.filters as ApplicationFilterCriteria;
      return appFilters.agentIds || [];
    }
    return [];
  });
  const [programIds, setProgramIds] = useState<string[]>(
    criteria?.filters?.programIds || []
  );
  const [applicationStatuses, setApplicationStatuses] = useState<string[]>(
    () => {
      if (criteria?.recipientType === 'applications') {
        const appFilters = criteria.filters as ApplicationFilterCriteria;
        return appFilters.statuses || [];
      }
      return [];
    }
  );
  const [isInternational, setIsInternational] = useState<boolean | undefined>(
    () => {
      if (criteria?.recipientType === 'applications') {
        const appFilters = criteria.filters as ApplicationFilterCriteria;
        return appFilters.isInternational;
      }
      return undefined;
    }
  );

  // Student filters
  const [studentStatuses, setStudentStatuses] = useState<string[]>(() => {
    if (criteria?.recipientType === 'students') {
      const studentFilters = criteria.filters as StudentFilterCriteria;
      return studentFilters.statuses || [];
    }
    return [];
  });

  const { data: agents = [] } = useGetAgents();
  const { data: programs = [] } = useGetPrograms();

  // Build criteria object
  const currentCriteria: AnnouncementFilterCriteria = {
    recipientType,
    filters:
      recipientType === 'students'
        ? {
            programIds: programIds.length > 0 ? programIds : undefined,
            statuses: studentStatuses.length > 0 ? studentStatuses : undefined,
          }
        : {
            agentIds: agentIds.length > 0 ? agentIds : undefined,
            programIds: programIds.length > 0 ? programIds : undefined,
            statuses:
              applicationStatuses.length > 0 ? applicationStatuses : undefined,
            isInternational,
          },
  };

  const { data: recipientCount = 0 } = useComputeRecipientCount(
    currentCriteria,
    true
  );

  // Update parent when criteria changes
  useEffect(() => {
    onCriteriaChange(currentCriteria);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    recipientType,
    agentIds,
    programIds,
    applicationStatuses,
    isInternational,
    studentStatuses,
  ]);

  const handleRecipientTypeChange = (value: 'students' | 'applications') => {
    setRecipientType(value);
    // Reset filters when switching types
    setAgentIds([]);
    setApplicationStatuses([]);
    setStudentStatuses([]);
    setIsInternational(undefined);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">Recipient Type</Label>
        <RadioGroup
          value={recipientType}
          onValueChange={handleRecipientTypeChange}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="students" id="students" />
            <Label htmlFor="students" className="font-normal">
              Students
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="applications" id="applications" />
            <Label htmlFor="applications" className="font-normal">
              Applications
            </Label>
          </div>
        </RadioGroup>
      </div>

      {recipientType === 'applications' && (
        <div className="space-y-4">
          <div>
            <Label>Agents</Label>
            <Select
              value={agentIds.length > 0 ? agentIds[0] : 'all'}
              onValueChange={(value) => {
                if (value === 'all') {
                  setAgentIds([]);
                } else {
                  setAgentIds([value]);
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Application Status</Label>
            <Select
              value={
                applicationStatuses.length > 0 ? applicationStatuses[0] : 'all'
              }
              onValueChange={(value) => {
                if (value === 'all') {
                  setApplicationStatuses([]);
                } else {
                  setApplicationStatuses([value]);
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="DRAFT">DRAFT</SelectItem>
                <SelectItem value="SUBMITTED">SUBMITTED</SelectItem>
                <SelectItem value="UNDER_REVIEW">UNDER_REVIEW</SelectItem>
                <SelectItem value="ACCEPTED">ACCEPTED</SelectItem>
                <SelectItem value="APPROVED">APPROVED</SelectItem>
                <SelectItem value="REJECTED">REJECTED</SelectItem>
                <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>International Students</Label>
            <Select
              value={
                isInternational === undefined
                  ? 'all'
                  : isInternational
                    ? 'yes'
                    : 'no'
              }
              onValueChange={(value) => {
                if (value === 'all') {
                  setIsInternational(undefined);
                } else {
                  setIsInternational(value === 'yes');
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">International only</SelectItem>
                <SelectItem value="no">Domestic only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {recipientType === 'students' && (
        <div className="space-y-4">
          <div>
            <Label>Student Status</Label>
            <Select
              value={studentStatuses.length > 0 ? studentStatuses[0] : 'all'}
              onValueChange={(value) => {
                if (value === 'all') {
                  setStudentStatuses([]);
                } else {
                  setStudentStatuses([value]);
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                <SelectItem value="WITHDRAWN">WITHDRAWN</SelectItem>
                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Common: Program filter */}
      <div>
        <Label>Program</Label>
        <Select
          value={programIds.length > 0 ? programIds[0] : 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              setProgramIds([]);
            } else {
              setProgramIds([value]);
            }
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="All programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programs</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Recipient count preview */}
      <div className="bg-muted/50 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Recipients</span>
          <Badge variant="default" className="text-lg">
            {recipientCount}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {recipientCount === 0
            ? 'No recipients match the selected filters.'
            : `${recipientCount} ${recipientCount === 1 ? 'recipient' : 'recipients'} will receive this announcement.`}
        </p>
      </div>
    </div>
  );
}
