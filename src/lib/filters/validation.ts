/**
 * Validation utilities for filter AST
 *
 * Validates:
 * - AST structure (proper nesting, valid combinators)
 * - Field IDs exist in domain map
 * - Operators are allowed for field types
 * - Values match field types
 */

import type {
  FilterAST,
  FilterGroup,
  FilterRule,
  ValidationError,
  FieldDefinition,
  Operator,
} from './types';
import { getFieldDefinition } from './domain-map';

/**
 * Validate a complete filter AST
 *
 * @param ast The filter AST to validate
 * @param maxDepth Maximum allowed nesting depth (default: 3)
 * @returns Array of validation errors (empty if valid)
 */
export const validateAST = (
  ast: FilterAST,
  maxDepth: number = 3
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Validate root group
  validateGroup(ast, '', errors, 0, maxDepth);

  return errors;
};

/**
 * Recursively validate a filter group
 */
const validateGroup = (
  group: FilterGroup,
  path: string,
  errors: ValidationError[],
  depth: number,
  maxDepth: number
): void => {
  // Check depth
  if (depth > maxDepth) {
    errors.push({
      path,
      message: `Maximum nesting depth of ${maxDepth} exceeded`,
      node: group,
    });
    return;
  }

  // Validate combinator
  if (group.combinator !== 'and' && group.combinator !== 'or') {
    errors.push({
      path,
      message: `Invalid combinator: ${group.combinator}. Must be 'and' or 'or'`,
      node: group,
    });
  }

  // Validate rules array
  if (!Array.isArray(group.rules)) {
    errors.push({
      path,
      message: 'Rules must be an array',
      node: group,
    });
    return;
  }

  // Validate empty groups
  if (group.rules.length === 0) {
    errors.push({
      path,
      message: 'Filter group cannot be empty',
      node: group,
    });
  }

  // Validate each rule/group
  group.rules.forEach((node, index) => {
    const nodePath = path ? `${path}.rules[${index}]` : `rules[${index}]`;

    if ('combinator' in node) {
      // It's a group
      validateGroup(node as FilterGroup, nodePath, errors, depth + 1, maxDepth);
    } else {
      // It's a rule
      validateRule(node as FilterRule, nodePath, errors);
    }
  });
};

/**
 * Validate a filter rule
 */
const validateRule = (
  rule: FilterRule,
  path: string,
  errors: ValidationError[]
): void => {
  // Validate required fields
  if (!rule.id) {
    errors.push({
      path,
      message: 'Rule must have an id',
      node: rule,
    });
  }

  if (!rule.fieldId) {
    errors.push({
      path,
      message: 'Rule must have a fieldId',
      node: rule,
    });
    return; // Can't validate further without fieldId
  }

  // Validate field exists in domain map
  const fieldDef = getFieldDefinition(rule.fieldId);
  if (!fieldDef) {
    errors.push({
      path,
      message: `Field '${rule.fieldId}' not found in domain map`,
      node: rule,
    });
    return; // Can't validate further without field definition
  }

  // Validate operator
  validateOperator(rule.operator, fieldDef, path, errors, rule);

  // Validate value
  validateValue(rule.value, rule.operator, fieldDef, path, errors, rule);
};

/**
 * Validate that an operator is allowed for a field type
 */
const validateOperator = (
  operator: Operator,
  fieldDef: FieldDefinition,
  path: string,
  errors: ValidationError[],
  rule: FilterRule
): void => {
  if (!fieldDef.operators.includes(operator)) {
    errors.push({
      path,
      message: `Operator '${operator}' is not allowed for field '${fieldDef.label}' (type: ${fieldDef.type}). Allowed operators: ${fieldDef.operators.join(', ')}`,
      node: rule,
    });
  }
};

/**
 * Validate that a value matches the field type and operator requirements
 */
const validateValue = (
  value:
    | string
    | number
    | boolean
    | string[]
    | number[]
    | Date
    | null
    | undefined,
  operator: Operator,
  fieldDef: FieldDefinition,
  path: string,
  errors: ValidationError[],
  rule: FilterRule
): void => {
  // Operators that don't require a value
  const nullaryOperators: Operator[] = ['isNull', 'isNotNull'];
  if (nullaryOperators.includes(operator)) {
    // Value should be null or undefined for these operators
    if (value !== null && value !== undefined) {
      errors.push({
        path,
        message: `Operator '${operator}' does not require a value`,
        node: rule,
      });
    }
    return;
  }

  // All other operators require a value
  if (value === null || value === undefined) {
    errors.push({
      path,
      message: `Operator '${operator}' requires a value`,
      node: rule,
    });
    return;
  }

  // Type-specific validation
  switch (fieldDef.type) {
    case 'text':
      if (typeof value !== 'string') {
        errors.push({
          path,
          message: `Field '${fieldDef.label}' expects a string value, got ${typeof value}`,
          node: rule,
        });
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push({
          path,
          message: `Field '${fieldDef.label}' expects a number value, got ${typeof value}`,
          node: rule,
        });
      }
      break;

    case 'date':
      // Accept ISO date strings or Date objects
      if (typeof value !== 'string' && !(value instanceof Date)) {
        errors.push({
          path,
          message: `Field '${fieldDef.label}' expects a date (string or Date), got ${typeof value}`,
          node: rule,
        });
      } else if (typeof value === 'string') {
        // Validate ISO date format
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push({
            path,
            message: `Field '${fieldDef.label}' expects a valid ISO date string`,
            node: rule,
          });
        }
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push({
          path,
          message: `Field '${fieldDef.label}' expects a boolean value, got ${typeof value}`,
          node: rule,
        });
      }
      break;

    case 'enum':
      // For 'in' and 'notIn' operators, value should be an array
      if (operator === 'in' || operator === 'notIn') {
        if (!Array.isArray(value)) {
          errors.push({
            path,
            message: `Operator '${operator}' requires an array of values`,
            node: rule,
          });
        } else if (fieldDef.options) {
          // Validate all values are in the enum options
          const stringValues = value.filter(
            (v): v is string => typeof v === 'string'
          );
          const invalidValues = stringValues.filter(
            (v) => !fieldDef.options!.includes(v)
          );
          if (invalidValues.length > 0) {
            errors.push({
              path,
              message: `Invalid enum values: ${invalidValues.join(', ')}. Allowed values: ${fieldDef.options.join(', ')}`,
              node: rule,
            });
          }
        }
      } else {
        // For other operators, value should be a single enum value
        if (
          fieldDef.options &&
          typeof value === 'string' &&
          !fieldDef.options.includes(value)
        ) {
          errors.push({
            path,
            message: `Invalid enum value: ${value}. Allowed values: ${fieldDef.options.join(', ')}`,
            node: rule,
          });
        }
      }
      break;
  }
};

/**
 * Check if an AST is valid (no errors)
 */
export const isValidAST = (ast: FilterAST, maxDepth?: number): boolean => {
  return validateAST(ast, maxDepth).length === 0;
};

/**
 * Get a human-readable summary of validation errors
 */
export const getValidationSummary = (errors: ValidationError[]): string => {
  if (errors.length === 0) {
    return 'Filter is valid';
  }

  return errors.map((error) => `${error.path}: ${error.message}`).join('\n');
};
