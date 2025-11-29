/**
 * QueryBuilder Component
 *
 * Main component for building filter queries.
 * Integrates with useFilterState for state management and renders FilterGroup.
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterGroupComponent } from './FilterGroup';
import { useFilterState } from '@/src/hooks/useFilterState';
import type {
  FilterAST,
  FilterRule,
  FilterGroup,
} from '@/src/lib/filters/types';
import { getFieldsForTable, FILTER_FIELDS } from '@/src/lib/filters/domain-map';

/**
 * Props for QueryBuilder component
 */
export interface QueryBuilderProps {
  /** Root table name (determines available fields) */
  rootTable: string;
  /** Optional initial filter AST */
  initialAST?: FilterAST;
  /** Callback when filters change */
  onFiltersChange?: (ast: FilterAST) => void;
  /** Maximum nesting depth (default: 3) */
  maxDepth?: number;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Custom title */
  title?: string;
}

/**
 * QueryBuilder Component
 */
export const QueryBuilder: React.FC<QueryBuilderProps> = ({
  rootTable,
  initialAST,
  onFiltersChange,
  maxDepth = 3,
  disabled = false,
  title = 'Filters',
}) => {
  // Use a unique param name per root table to avoid conflicts
  const paramName = `masterFilters_${rootTable}`;

  const {
    ast,
    updateAST,
    resetFilter,
    addRule,
    updateRule,
    addGroup,
    updateGroupCombinator,
    hasActiveFilters,
    activeFilterCount,
  } = useFilterState({ paramName });

  // Use initial AST if provided, otherwise use state from URL
  const currentAST = initialAST || ast;

  // Notify parent of changes
  React.useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(currentAST);
    }
  }, [currentAST, onFiltersChange]);

  // Get available fields for this root table
  const availableFields = getFieldsForTable(rootTable);

  // Handle adding a rule to the root group
  const handleAddRule = () => {
    if (availableFields.length === 0) return;

    // Find first field ID for this root table
    const firstFieldId =
      Object.keys(FILTER_FIELDS).find(
        (id) => FILTER_FIELDS[id].rootTable === rootTable
      ) || '';

    if (!firstFieldId) return;

    const fieldDef = FILTER_FIELDS[firstFieldId];
    const defaultOperator = fieldDef.operators[0] || 'eq';

    addRule(currentAST.id, {
      fieldId: firstFieldId,
      operator: defaultOperator,
      value: undefined,
    });
  };

  // Handle adding a group to the root group
  const handleAddGroup = () => {
    addGroup(currentAST.id, 'and');
  };

  // Handle removing a node from the root group
  const handleRemoveNode = (nodeId: string) => {
    if ('combinator' in currentAST) {
      // Remove from root group
      const newRules = currentAST.rules.filter((node) => node.id !== nodeId);
      updateAST({
        ...currentAST,
        rules: newRules,
      });
    }
  };

  // Handle updating a rule in the root group
  const handleUpdateRule = (ruleId: string, updates: Partial<FilterRule>) => {
    updateRule(ruleId, updates);
  };

  // Handle updating a nested group
  const handleUpdateGroup = (
    groupId: string,
    updates: Partial<FilterGroup>
  ) => {
    if (groupId === currentAST.id) {
      // Updating root group
      updateAST({ ...currentAST, ...updates });
    } else {
      // Updating nested group - need to recursively update
      const updateNestedGroup = (group: FilterGroup): FilterGroup => {
        if (group.id === groupId) {
          return { ...group, ...updates };
        }
        return {
          ...group,
          rules: group.rules.map((node) => {
            if ('combinator' in node) {
              return updateNestedGroup(node);
            }
            return node;
          }),
        };
      };

      updateAST(updateNestedGroup(currentAST));
    }
  };

  // Handle updating root group
  const handleUpdateRootGroup = (updates: Partial<FilterGroup>) => {
    if (updates.combinator) {
      updateGroupCombinator(currentAST.id, updates.combinator);
    } else {
      updateAST({ ...currentAST, ...updates });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <span className="text-muted-foreground text-sm">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}{' '}
                active
              </span>
            )}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilter}
                disabled={disabled}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <FilterGroupComponent
          group={currentAST}
          rootTable={rootTable}
          onUpdate={handleUpdateRootGroup}
          onAddRule={handleAddRule}
          onAddGroup={handleAddGroup}
          onRemoveNode={handleRemoveNode}
          onUpdateRule={handleUpdateRule}
          onUpdateGroup={handleUpdateGroup}
          isRoot={true}
          depth={0}
          maxDepth={maxDepth}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
};
