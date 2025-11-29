/**
 * Query Compiler
 *
 * Converts filter AST + domain map into Supabase PostgREST queries.
 *
 * Key responsibilities:
 * - Analyze AST to determine required relations
 * - Build dynamic select strings with only needed joins
 * - Compile filter groups into PostgREST filter strings
 * - Handle nested AND/OR combinations
 * - Use !inner joins when filtering on relations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FilterAST,
  FilterGroup,
  FilterRule,
  FilterNode,
  RequiredRelations,
  QueryCompilationOptions,
  Operator,
} from './types';
import { getFieldDefinition } from './domain-map';

/**
 * Analyze an AST to determine which relations are required
 *
 * @param ast The filter AST
 * @param rootTable The root table being queried
 * @returns Required relations and which need !inner joins
 */
export const analyzeRequiredRelations = (
  ast: FilterAST,
  rootTable: string
): RequiredRelations => {
  const relations = new Set<string>();
  const innerJoins = new Set<string>();

  const analyzeNode = (node: FilterNode): void => {
    if ('combinator' in node) {
      // It's a group - recurse
      node.rules.forEach(analyzeNode);
    } else {
      // It's a rule - check field definition
      const fieldDef = getFieldDefinition(node.fieldId);
      if (
        fieldDef &&
        fieldDef.rootTable === rootTable &&
        fieldDef.relationPath
      ) {
        // This field requires relations
        fieldDef.relationPath.forEach((rel) => relations.add(rel));

        // If this rule is filtering (not just selecting), we need !inner
        // For now, assume all rules in filters need !inner
        if (fieldDef.relationPath.length > 0) {
          // Mark the deepest relation as needing !inner
          innerJoins.add(
            fieldDef.relationPath[fieldDef.relationPath.length - 1]
          );
        }
      }
    }
  };

  analyzeNode(ast);

  return { relations, innerJoins };
};

/**
 * Build a select string with dynamic joins based on required relations
 *
 * @param rootTable The root table
 * @param requiredRelations Relations that need to be joined
 * @param selectFields Additional fields to select (for UI display)
 * @returns PostgREST select string
 */
export const buildSelectString = (
  rootTable: string,
  requiredRelations: RequiredRelations,
  selectFields?: string[]
): string => {
  const parts: string[] = ['*']; // Always select all root table fields

  // Build relation selects
  const relationSelects: string[] = [];

  requiredRelations.relations.forEach((relation) => {
    const isInner = requiredRelations.innerJoins.has(relation);
    const prefix = isInner ? '!' : '';
    relationSelects.push(`${relation}${prefix}inner (*)`);
  });

  if (relationSelects.length > 0) {
    parts.push(...relationSelects);
  }

  // Add additional select fields if specified
  if (selectFields && selectFields.length > 0) {
    parts.push(...selectFields);
  }

  return parts.join(', ');
};

/**
 * Compile a filter AST into a Supabase query
 *
 * @param supabase Supabase client
 * @param ast Filter AST
 * @param options Compilation options
 * @returns Configured Supabase query builder
 */
export const buildSupabaseQuery = (
  supabase: SupabaseClient,
  ast: FilterAST,
  options: QueryCompilationOptions
) => {
  const { rootTable, selectFields, includeCount } = options;

  // Analyze required relations
  const requiredRelations = analyzeRequiredRelations(ast, rootTable);

  // Build select string
  const selectString = buildSelectString(
    rootTable,
    requiredRelations,
    selectFields
  );

  // Start query
  // Type assertion needed because rootTable is a string, not a literal table name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from(rootTable as any) as any).select(selectString, {
    count: includeCount ? 'exact' : undefined,
  });

  // Compile filters
  const filterString = compileFilterGroup(ast, rootTable);

  if (filterString) {
    // Apply filter using PostgREST filter string syntax
    // PostgREST uses .or() for OR queries and chained methods for AND
    // For complex nested queries, we construct the filter string
    if (ast.combinator === 'or') {
      query = query.or(filterString);
    } else {
      // For 'and', PostgREST chains filters by default
      // If we have a complex nested structure, we need to use the filter string
      // For simple AND queries, we can chain, but for nested we use .or() with and() syntax
      if (filterString.includes('and(') || filterString.includes('or(')) {
        // Complex nested query - use filter string with and() wrapper
        query = query.or(`and(${filterString})`);
      } else {
        // Simple AND query - PostgREST chains by default, but we need to use .or() for consistency
        query = query.or(`and(${filterString})`);
      }
    }
  }

  // Type assertion needed because the query builder type is complex and depends on table name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return query as any;
};

/**
 * Compile a filter group into a PostgREST filter string
 *
 * @param group Filter group to compile
 * @param rootTable Root table name
 * @returns PostgREST filter string
 */
export const compileFilterGroup = (
  group: FilterGroup,
  rootTable: string
): string => {
  if (group.rules.length === 0) {
    return '';
  }

  const parts: string[] = [];

  group.rules.forEach((node: FilterGroup | FilterRule) => {
    if ('combinator' in node) {
      // It's a nested group
      const nestedFilter = compileFilterGroup(node as FilterGroup, rootTable);
      if (nestedFilter) {
        parts.push(`(${nestedFilter})`);
      }
    } else {
      // It's a rule
      const ruleFilter = compileFilterRule(node as FilterRule, rootTable);
      if (ruleFilter) {
        parts.push(ruleFilter);
      }
    }
  });

  if (parts.length === 0) {
    return '';
  }

  // Join parts with the combinator
  if (group.combinator === 'or') {
    return parts.join(',');
  } else {
    // For 'and', we need to wrap in and() function
    if (parts.length === 1) {
      return parts[0];
    }
    return `and(${parts.join(',')})`;
  }
};

/**
 * Compile a single filter rule into a PostgREST filter string
 *
 * @param rule Filter rule to compile
 * @param rootTable Root table name
 * @returns PostgREST filter string (e.g., "status.eq.ACTIVE" or "applications.agents.name.ilike.*John*")
 */
export const compileFilterRule = (
  rule: FilterRule,
  rootTable: string
): string => {
  const fieldDef = getFieldDefinition(rule.fieldId);

  if (!fieldDef || fieldDef.rootTable !== rootTable) {
    console.warn(`Field ${rule.fieldId} not found or wrong root table`);
    return '';
  }

  // Map operator to PostgREST operator
  const operator = mapOperatorToPostgREST(rule.operator);

  // Build the field path
  const fieldPath = fieldDef.dbPath;

  // Format the value for PostgREST
  const formattedValue = formatValueForPostgREST(
    rule.value,
    rule.operator,
    fieldDef.type
  );

  // Special handling for nullary operators
  if (rule.operator === 'isNull') {
    return `${fieldPath}.is.null`;
  }
  if (rule.operator === 'isNotNull') {
    return `${fieldPath}.not.is.null`;
  }

  // Build the filter string: field.operator.value
  return `${fieldPath}.${operator}.${formattedValue}`;
};

/**
 * Map our operator to PostgREST operator syntax
 */
const mapOperatorToPostgREST = (operator: Operator): string => {
  switch (operator) {
    case 'eq':
      return 'eq';
    case 'neq':
      return 'neq';
    case 'gt':
      return 'gt';
    case 'gte':
      return 'gte';
    case 'lt':
      return 'lt';
    case 'lte':
      return 'lte';
    case 'contains':
      return 'ilike'; // Case-insensitive like
    case 'startsWith':
      return 'ilike';
    case 'endsWith':
      return 'ilike';
    case 'in':
      return 'in';
    case 'notIn':
      return 'not.in';
    case 'isNull':
    case 'isNotNull':
      return 'is'; // Handled separately
    default:
      return 'eq';
  }
};

/**
 * Format a value for PostgREST filter string
 *
 * Handles:
 * - String escaping and wildcards for ilike
 * - Array formatting for 'in' operators
 * - Date formatting
 * - URL encoding
 */
const formatValueForPostgREST = (
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
  fieldType: string
): string => {
  // Handle array values (for 'in' and 'notIn')
  if (operator === 'in' || operator === 'notIn') {
    if (Array.isArray(value)) {
      // PostgREST expects: (value1,value2,value3)
      const validValues: (string | number | boolean | Date)[] = [];
      for (const v of value) {
        if (v !== null && v !== undefined && !Array.isArray(v)) {
          if (
            typeof v === 'string' ||
            typeof v === 'number' ||
            typeof v === 'boolean'
          ) {
            validValues.push(v);
          } else if (v && typeof v === 'object' && 'getTime' in v) {
            // Check if it's a Date object
            validValues.push(v as Date);
          }
        }
      }
      const formatted = validValues
        .map((v) => formatSingleValue(v, fieldType))
        .join(',');
      return `(${formatted})`;
    }
  }

  // Handle string operators with wildcards
  if (operator === 'contains') {
    // Add wildcards: *value*
    if (Array.isArray(value) || value === null || value === undefined) {
      return 'null';
    }
    const str = formatSingleValue(value, fieldType);
    return `*${str}*`;
  } else if (operator === 'startsWith') {
    // Add trailing wildcard: value*
    if (Array.isArray(value) || value === null || value === undefined) {
      return 'null';
    }
    const str = formatSingleValue(value, fieldType);
    return `${str}*`;
  } else if (operator === 'endsWith') {
    // Add leading wildcard: *value
    if (Array.isArray(value) || value === null || value === undefined) {
      return 'null';
    }
    const str = formatSingleValue(value, fieldType);
    return `*${str}`;
  }

  // Default: format single value
  if (Array.isArray(value)) {
    return 'null';
  }
  return formatSingleValue(value, fieldType);
};

/**
 * Format a single value for PostgREST
 */
const formatSingleValue = (
  value: string | number | boolean | Date | null | undefined,
  fieldType: string
): string => {
  if (value === null || value === undefined) {
    return 'null';
  }

  // Handle dates
  if (fieldType === 'date' || value instanceof Date) {
    let date: Date;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      date = new Date(value);
    } else {
      return 'null';
    }
    // PostgREST expects ISO date strings
    if (isNaN(date.getTime())) {
      return 'null';
    }
    return date.toISOString();
  }

  // Handle strings - escape special characters and URL encode
  if (typeof value === 'string') {
    // PostgREST handles spaces and special chars, but we should URL encode
    // However, Supabase client handles encoding, so we return as-is
    // But we need to handle quotes and backslashes
    return value.replace(/\\/g, '\\\\').replace(/'/g, "''");
  }

  // Numbers and booleans - convert to string
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  // Arrays - should not reach here for formatSingleValue, but handle gracefully
  return 'null';
};

/**
 * Helper to determine if a query is simple enough for chained methods
 * vs. needing a raw filter string
 */
export const isSimpleQuery = (ast: FilterAST): boolean => {
  // Simple if:
  // - Single group with 'and' combinator
  // - All rules (no nested groups)
  // - Depth <= 1

  if (ast.combinator !== 'and') {
    return false;
  }

  if (ast.rules.some((node) => 'combinator' in node)) {
    return false; // Has nested groups
  }

  return true;
};
