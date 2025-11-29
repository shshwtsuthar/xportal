/**
 * Core types for the Master Filter System
 *
 * This file defines the Abstract Syntax Tree (AST) structure for filters,
 * which allows users to build complex nested AND/OR queries.
 */

/**
 * Supported filter operators
 */
export type Operator =
  | 'eq' // equals
  | 'neq' // not equals
  | 'gt' // greater than
  | 'gte' // greater than or equal
  | 'lt' // less than
  | 'lte' // less than or equal
  | 'contains' // case-insensitive contains (ilike)
  | 'startsWith' // case-insensitive starts with
  | 'endsWith' // case-insensitive ends with
  | 'in' // value in array
  | 'notIn' // value not in array
  | 'isNull' // field is null
  | 'isNotNull'; // field is not null

/**
 * A single filter rule
 *
 * Example: "student_status equals ACTIVE"
 */
export interface FilterRule {
  id: string; // Unique identifier for this rule
  fieldId: string; // References a field in the domain map (e.g., "student_status")
  operator: Operator;
  value:
    | string
    | number
    | boolean
    | string[]
    | number[]
    | Date
    | null
    | undefined; // The value to compare against (type depends on field type)
}

/**
 * A filter group containing rules and/or nested groups
 *
 * Example: "student_status equals ACTIVE AND (agent_name contains 'Global' OR program_code equals 'BSB50420')"
 */
export interface FilterGroup {
  id: string; // Unique identifier for this group
  combinator: 'and' | 'or'; // How to combine the rules/groups
  rules: FilterNode[]; // Array of rules and/or nested groups
}

/**
 * A node in the filter AST - either a rule or a group
 */
export type FilterNode = FilterRule | FilterGroup;

/**
 * The root filter AST structure
 * This is the top-level filter that can contain groups and rules
 */
export type FilterAST = FilterGroup;

/**
 * Field type definitions for validation and UI rendering
 */
export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'enum';

/**
 * Field definition in the domain map
 * Maps business-friendly field IDs to database paths
 */
export interface FieldDefinition {
  /** User-friendly label for the field */
  label: string;
  /** Type of the field (determines input component and operators) */
  type: FieldType;
  /** Dot-notation path from root table to this field (e.g., "first_name" or "applications.agents.name") */
  dbPath: string;
  /** Array of relation names needed to reach this field (e.g., ["applications", "agents"]) */
  relationPath?: string[];
  /** For enum fields, the list of valid options */
  options?: string[];
  /** The root table this field belongs to (e.g., "students", "applications") */
  rootTable: string;
  /** Allowed operators for this field type */
  operators: Operator[];
  /** Whether this field can be null */
  nullable?: boolean;
}

/**
 * Domain map configuration
 * Maps field IDs to their definitions
 */
export type DomainMap = Record<string, FieldDefinition>;

/**
 * Query compilation options
 */
export interface QueryCompilationOptions {
  /** Root table to query from */
  rootTable: string;
  /** Additional fields to select (for UI display) */
  selectFields?: string[];
  /** Whether to include count in the query */
  includeCount?: boolean;
  /** Maximum nesting depth to allow (default: 3) */
  maxDepth?: number;
}

/**
 * Result of analyzing required relations from an AST
 */
export interface RequiredRelations {
  /** Set of relation names that need to be joined */
  relations: Set<string>;
  /** Set of relation names that need !inner joins (because they're used in filters) */
  innerJoins: Set<string>;
}

/**
 * Validation error for filter AST
 */
export interface ValidationError {
  /** Path to the node with the error (e.g., "rules[0].rules[1]") */
  path: string;
  /** Error message */
  message: string;
  /** The node that has the error */
  node: FilterNode;
}
