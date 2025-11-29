/**
 * FilterGroup Component
 *
 * Renders a filter group with:
 * - Combinator toggle (AND/OR)
 * - Nested rules and groups
 * - Add rule/group buttons
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { FilterRuleComponent } from './FilterRule';
import type { FilterGroup, FilterRule } from '@/src/lib/filters/types';
import { getFieldsForTable } from '@/src/lib/filters/domain-map';
import { cn } from '@/lib/utils';

/**
 * Props for FilterGroup component
 */
export interface FilterGroupProps {
  /** The filter group to display/edit */
  group: FilterGroup;
  /** Root table name */
  rootTable: string;
  /** Handler for group updates */
  onUpdate: (updates: Partial<FilterGroup>) => void;
  /** Handler for group removal */
  onRemove?: () => void;
  /** Handler for adding a rule to this group */
  onAddRule: () => void;
  /** Handler for adding a nested group to this group */
  onAddGroup: () => void;
  /** Handler for removing a rule/group from this group */
  onRemoveNode: (nodeId: string) => void;
  /** Handler for updating a rule in this group */
  onUpdateRule: (ruleId: string, updates: Partial<FilterRule>) => void;
  /** Handler for updating a nested group in this group */
  onUpdateGroup: (groupId: string, updates: Partial<FilterGroup>) => void;
  /** Whether this is the root group (can't be removed) */
  isRoot?: boolean;
  /** Current nesting depth */
  depth?: number;
  /** Maximum allowed nesting depth */
  maxDepth?: number;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * FilterGroup Component
 */
export const FilterGroupComponent: React.FC<FilterGroupProps> = ({
  group,
  rootTable,
  onUpdate,
  onRemove,
  onAddRule,
  onAddGroup,
  onRemoveNode,
  onUpdateRule,
  onUpdateGroup,
  isRoot = false,
  depth = 0,
  maxDepth = 3,
  disabled = false,
}) => {
  const canAddGroup = depth < maxDepth;
  const availableFields = getFieldsForTable(rootTable);

  // Handle combinator change
  const handleCombinatorChange = (combinator: 'and' | 'or') => {
    onUpdate({ combinator });
  };

  // Handle node removal
  const handleRemoveNode = (nodeId: string) => {
    onRemoveNode(nodeId);
  };

  // Handle rule update
  const handleUpdateRule = (ruleId: string, updates: Partial<FilterRule>) => {
    onUpdateRule(ruleId, updates);
  };

  // Handle nested group update
  const handleUpdateGroup = (
    groupId: string,
    updates: Partial<FilterGroup>
  ) => {
    onUpdateGroup(groupId, updates);
  };

  return (
    <div className="space-y-2">
      {/* Group Header */}
      <div className="flex items-center gap-2">
        {!isRoot && (
          <div className="bg-muted flex items-center gap-2 rounded-md px-2 py-1">
            <Select
              value={group.combinator}
              onValueChange={handleCombinatorChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">AND</SelectItem>
                <SelectItem value="or">OR</SelectItem>
              </SelectContent>
            </Select>

            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {isRoot && group.rules.length === 0 && (
          <div className="text-muted-foreground text-sm">
            No filters applied. Add a rule to start filtering.
          </div>
        )}
      </div>

      {/* Rules and Nested Groups */}
      {group.rules.length > 0 && (
        <div className={cn('space-y-2', !isRoot && 'ml-4 border-l-2 pl-4')}>
          {group.rules.map((node) => {
            if ('combinator' in node) {
              // It's a nested group
              return (
                <FilterGroupComponent
                  key={node.id}
                  group={node}
                  rootTable={rootTable}
                  onUpdate={(updates) => handleUpdateGroup(node.id, updates)}
                  onRemove={() => handleRemoveNode(node.id)}
                  onAddRule={onAddRule}
                  onAddGroup={onAddGroup}
                  onRemoveNode={handleRemoveNode}
                  onUpdateRule={handleUpdateRule}
                  onUpdateGroup={handleUpdateGroup}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  disabled={disabled}
                />
              );
            } else {
              // It's a rule
              return (
                <FilterRuleComponent
                  key={node.id}
                  rule={node}
                  rootTable={rootTable}
                  onUpdate={(updates) => handleUpdateRule(node.id, updates)}
                  onRemove={() => handleRemoveNode(node.id)}
                  disabled={disabled}
                />
              );
            }
          })}
        </div>
      )}

      {/* Add Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddRule}
          disabled={disabled || availableFields.length === 0}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>

        {canAddGroup && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddGroup}
            disabled={disabled}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Group
          </Button>
        )}
      </div>
    </div>
  );
};
