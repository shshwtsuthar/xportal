/**
 * FilterRule Component
 *
 * Renders a single filter rule with:
 * - Field selector (dropdown)
 * - Operator selector (based on field type)
 * - Value input (type-specific)
 */

'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { FieldInput } from './FieldInput';
import {
  getFieldsForTable,
  getFieldDefinition,
  FILTER_FIELDS,
} from '@/src/lib/filters/domain-map';
import type { FilterRule, Operator } from '@/src/lib/filters/types';

/**
 * Props for FilterRule component
 */
export interface FilterRuleProps {
  /** The filter rule to display/edit */
  rule: FilterRule;
  /** Root table name (determines available fields) */
  rootTable: string;
  /** Handler for rule updates */
  onUpdate: (updates: Partial<FilterRule>) => void;
  /** Handler for rule removal */
  onRemove: () => void;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * Get available operators for a field type
 */
const getOperatorsForFieldType = (fieldType: string): Operator[] => {
  switch (fieldType) {
    case 'text':
      return [
        'eq',
        'neq',
        'contains',
        'startsWith',
        'endsWith',
        'isNull',
        'isNotNull',
      ];
    case 'number':
      return [
        'eq',
        'neq',
        'gt',
        'gte',
        'lt',
        'lte',
        'in',
        'notIn',
        'isNull',
        'isNotNull',
      ];
    case 'date':
      return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'isNull', 'isNotNull'];
    case 'boolean':
      return ['eq', 'neq', 'isNull', 'isNotNull'];
    case 'enum':
      return ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'];
    default:
      return ['eq', 'neq', 'isNull', 'isNotNull'];
  }
};

/**
 * Operator labels for display
 */
const operatorLabels: Record<Operator, string> = {
  eq: 'equals',
  neq: 'not equals',
  gt: 'greater than',
  gte: 'greater than or equal',
  lt: 'less than',
  lte: 'less than or equal',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  in: 'in',
  notIn: 'not in',
  isNull: 'is null',
  isNotNull: 'is not null',
};

/**
 * FilterRule Component
 */
export const FilterRuleComponent: React.FC<FilterRuleProps> = ({
  rule,
  rootTable,
  onUpdate,
  onRemove,
  disabled = false,
}) => {
  // Get available fields for this root table
  const availableFields = getFieldsForTable(rootTable);

  // Get current field definition
  const fieldDef = getFieldDefinition(rule.fieldId);

  // Get available operators (either from field definition or based on type)
  const availableOperators = fieldDef
    ? fieldDef.operators
    : rule.fieldId
      ? getOperatorsForFieldType('text') // Fallback
      : [];

  // Handle field change
  const handleFieldChange = (fieldId: string) => {
    const newFieldDef = getFieldDefinition(fieldId);
    if (newFieldDef) {
      // Reset operator and value when field changes
      const newOperators = newFieldDef.operators;
      const defaultOperator = newOperators[0] || 'eq';

      onUpdate({
        fieldId,
        operator: defaultOperator,
        value: undefined, // Reset value when field changes
      });
    }
  };

  // Handle operator change
  const handleOperatorChange = (operator: Operator) => {
    // Reset value for nullary operators
    if (operator === 'isNull' || operator === 'isNotNull') {
      onUpdate({ operator, value: null });
    } else {
      onUpdate({ operator });
    }
  };

  // Handle value change
  const handleValueChange = (
    value:
      | string
      | number
      | boolean
      | string[]
      | number[]
      | Date
      | null
      | undefined
  ) => {
    onUpdate({ value });
  };

  return (
    <div className="bg-card flex items-start gap-2 rounded-md border p-3">
      <div className="grid flex-1 grid-cols-3 gap-2">
        {/* Field Selector */}
        <Select
          value={rule.fieldId || ''}
          onValueChange={handleFieldChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            {availableFields.map((field) => {
              // Find the field ID by matching the definition
              const allFieldIds = Object.keys(FILTER_FIELDS) as Array<
                keyof typeof FILTER_FIELDS
              >;
              const fieldId =
                allFieldIds.find((id: keyof typeof FILTER_FIELDS) => {
                  const fieldDef = FILTER_FIELDS[id];
                  return (
                    fieldDef.rootTable === field.rootTable &&
                    fieldDef.dbPath === field.dbPath
                  );
                }) || `${field.rootTable}_${field.dbPath.replace(/\./g, '_')}`;

              return (
                <SelectItem key={fieldId} value={fieldId}>
                  {field.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Operator Selector */}
        {rule.fieldId && (
          <Select
            value={rule.operator}
            onValueChange={handleOperatorChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              {availableOperators.map((op) => (
                <SelectItem key={op} value={op}>
                  {operatorLabels[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Value Input */}
        {rule.fieldId && fieldDef && (
          <div className="flex-1">
            <FieldInput
              type={fieldDef.type}
              value={rule.value}
              onChange={handleValueChange}
              operator={rule.operator}
              options={fieldDef.options}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={disabled}
        className="shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
