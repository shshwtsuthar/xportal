/**
 * Domain Map Configuration
 *
 * Maps business-friendly field IDs to database paths and metadata.
 * This is the "brain" of the filter system - it tells the query compiler
 * how to translate user-friendly field names into database queries.
 *
 * Field IDs follow the pattern: {entity}_{field_name}
 * Examples: student_first_name, application_status, invoice_amount_due
 */

import type { FieldDefinition, DomainMap, Operator } from './types';

/**
 * Helper to create field definitions with common operators
 */
const textOperators: Operator[] = [
  'eq',
  'neq',
  'contains',
  'startsWith',
  'endsWith',
  'isNull',
  'isNotNull',
];
const numberOperators: Operator[] = [
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
const dateOperators: Operator[] = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'isNull',
  'isNotNull',
];
const booleanOperators: Operator[] = ['eq', 'neq', 'isNull', 'isNotNull'];
const enumOperators: Operator[] = [
  'eq',
  'neq',
  'in',
  'notIn',
  'isNull',
  'isNotNull',
];

/**
 * Master Domain Map
 *
 * Organized by root table for clarity. Each field definition includes:
 * - label: User-friendly name
 * - type: Field type (determines input component)
 * - dbPath: Database path (dot-notation from root table)
 * - relationPath: Relations needed to reach this field
 * - rootTable: Which table this field belongs to
 * - operators: Allowed operators for this field
 */
export const FILTER_FIELDS: DomainMap = {
  // ============================================
  // STUDENTS TABLE FIELDS
  // ============================================

  student_id: {
    label: 'Student ID',
    type: 'text',
    dbPath: 'id',
    rootTable: 'students',
    operators: ['eq', 'neq', 'contains', 'in', 'notIn'],
  },

  student_display_id: {
    label: 'Student Display ID',
    type: 'text',
    dbPath: 'student_id_display',
    rootTable: 'students',
    operators: textOperators,
  },

  student_first_name: {
    label: 'First Name',
    type: 'text',
    dbPath: 'first_name',
    rootTable: 'students',
    operators: textOperators,
  },

  student_last_name: {
    label: 'Last Name',
    type: 'text',
    dbPath: 'last_name',
    rootTable: 'students',
    operators: textOperators,
  },

  student_email: {
    label: 'Email',
    type: 'text',
    dbPath: 'email',
    rootTable: 'students',
    operators: textOperators,
  },

  student_status: {
    label: 'Status',
    type: 'enum',
    dbPath: 'status',
    rootTable: 'students',
    operators: enumOperators,
    options: ['ACTIVE', 'INACTIVE', 'COMPLETED', 'WITHDRAWN'],
  },

  student_date_of_birth: {
    label: 'Date of Birth',
    type: 'date',
    dbPath: 'date_of_birth',
    rootTable: 'students',
    operators: dateOperators,
  },

  student_created_at: {
    label: 'Created At',
    type: 'date',
    dbPath: 'created_at',
    rootTable: 'students',
    operators: dateOperators,
  },

  student_mobile_phone: {
    label: 'Mobile Phone',
    type: 'text',
    dbPath: 'mobile_phone',
    rootTable: 'students',
    operators: textOperators,
    nullable: true,
  },

  // ============================================
  // STUDENTS -> APPLICATIONS (1 level deep)
  // ============================================

  application_id: {
    label: 'Application ID',
    type: 'text',
    dbPath: 'applications.id',
    relationPath: ['applications'],
    rootTable: 'students',
    operators: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  },

  application_status: {
    label: 'Application Status',
    type: 'enum',
    dbPath: 'applications.status',
    relationPath: ['applications'],
    rootTable: 'students',
    operators: enumOperators,
    options: [
      'DRAFT',
      'SUBMITTED',
      'OFFER_GENERATED',
      'OFFER_SENT',
      'ACCEPTED',
      'REJECTED',
      'APPROVED',
      'ARCHIVED',
    ],
  },

  application_created_at: {
    label: 'Application Created At',
    type: 'date',
    dbPath: 'applications.created_at',
    relationPath: ['applications'],
    rootTable: 'students',
    operators: dateOperators,
  },

  // ============================================
  // STUDENTS -> APPLICATIONS -> AGENTS (2 levels deep)
  // ============================================

  agent_id: {
    label: 'Agent ID',
    type: 'text',
    dbPath: 'applications.agents.id',
    relationPath: ['applications', 'agents'],
    rootTable: 'students',
    operators: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  },

  agent_name: {
    label: 'Agent Name',
    type: 'text',
    dbPath: 'applications.agents.name',
    relationPath: ['applications', 'agents'],
    rootTable: 'students',
    operators: textOperators,
  },

  // ============================================
  // STUDENTS -> ENROLLMENTS (1 level deep)
  // ============================================

  enrollment_id: {
    label: 'Enrollment ID',
    type: 'text',
    dbPath: 'enrollments.id',
    relationPath: ['enrollments'],
    rootTable: 'students',
    operators: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  },

  enrollment_status: {
    label: 'Enrollment Status',
    type: 'enum',
    dbPath: 'enrollments.status',
    relationPath: ['enrollments'],
    rootTable: 'students',
    operators: enumOperators,
    options: ['PENDING', 'ACTIVE', 'COMPLETED', 'WITHDRAWN', 'DEFERRED'],
  },

  enrollment_commencement_date: {
    label: 'Enrollment Commencement Date',
    type: 'date',
    dbPath: 'enrollments.commencement_date',
    relationPath: ['enrollments'],
    rootTable: 'students',
    operators: dateOperators,
  },

  enrollment_expected_completion_date: {
    label: 'Expected Completion Date',
    type: 'date',
    dbPath: 'enrollments.expected_completion_date',
    relationPath: ['enrollments'],
    rootTable: 'students',
    operators: dateOperators,
    nullable: true,
  },

  // ============================================
  // STUDENTS -> ENROLLMENTS -> PROGRAMS (2 levels deep)
  // ============================================

  program_id: {
    label: 'Program ID',
    type: 'text',
    dbPath: 'enrollments.programs.id',
    relationPath: ['enrollments', 'programs'],
    rootTable: 'students',
    operators: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  },

  program_name: {
    label: 'Program Name',
    type: 'text',
    dbPath: 'enrollments.programs.name',
    relationPath: ['enrollments', 'programs'],
    rootTable: 'students',
    operators: textOperators,
  },

  program_code: {
    label: 'Program Code',
    type: 'text',
    dbPath: 'enrollments.programs.code',
    relationPath: ['enrollments', 'programs'],
    rootTable: 'students',
    operators: textOperators,
  },

  // ============================================
  // APPLICATIONS TABLE FIELDS
  // ============================================

  application_display_id: {
    label: 'Application Display ID',
    type: 'text',
    dbPath: 'application_id_display',
    rootTable: 'applications',
    operators: textOperators,
  },

  application_first_name: {
    label: 'First Name',
    type: 'text',
    dbPath: 'first_name',
    rootTable: 'applications',
    operators: textOperators,
    nullable: true,
  },

  application_last_name: {
    label: 'Last Name',
    type: 'text',
    dbPath: 'last_name',
    rootTable: 'applications',
    operators: textOperators,
    nullable: true,
  },

  application_email: {
    label: 'Email',
    type: 'text',
    dbPath: 'email',
    rootTable: 'applications',
    operators: textOperators,
    nullable: true,
  },

  application_status_direct: {
    label: 'Status',
    type: 'enum',
    dbPath: 'status',
    rootTable: 'applications',
    operators: enumOperators,
    options: [
      'DRAFT',
      'SUBMITTED',
      'OFFER_GENERATED',
      'OFFER_SENT',
      'ACCEPTED',
      'REJECTED',
      'APPROVED',
      'ARCHIVED',
    ],
  },

  application_is_international: {
    label: 'Is International',
    type: 'boolean',
    dbPath: 'is_international',
    rootTable: 'applications',
    operators: booleanOperators,
    nullable: true,
  },

  application_created_at_direct: {
    label: 'Created At',
    type: 'date',
    dbPath: 'created_at',
    rootTable: 'applications',
    operators: dateOperators,
  },

  application_updated_at: {
    label: 'Updated At',
    type: 'date',
    dbPath: 'updated_at',
    rootTable: 'applications',
    operators: dateOperators,
    nullable: true,
  },

  application_offer_generated_at: {
    label: 'Offer Generated At',
    type: 'date',
    dbPath: 'offer_generated_at',
    rootTable: 'applications',
    operators: dateOperators,
    nullable: true,
  },

  application_requested_start_date: {
    label: 'Requested Start Date',
    type: 'date',
    dbPath: 'requested_start_date',
    rootTable: 'applications',
    operators: dateOperators,
    nullable: true,
  },

  // ============================================
  // APPLICATIONS -> AGENTS (1 level deep)
  // ============================================

  application_agent_id: {
    label: 'Agent ID',
    type: 'text',
    dbPath: 'agents.id',
    relationPath: ['agents'],
    rootTable: 'applications',
    operators: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  },

  application_agent_name: {
    label: 'Agent Name',
    type: 'text',
    dbPath: 'agents.name',
    relationPath: ['agents'],
    rootTable: 'applications',
    operators: textOperators,
  },

  // ============================================
  // APPLICATIONS -> PROGRAMS (1 level deep)
  // ============================================

  application_program_id: {
    label: 'Program ID',
    type: 'text',
    dbPath: 'programs.id',
    relationPath: ['programs'],
    rootTable: 'applications',
    operators: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  },

  application_program_name: {
    label: 'Program Name',
    type: 'text',
    dbPath: 'programs.name',
    relationPath: ['programs'],
    rootTable: 'applications',
    operators: textOperators,
  },

  application_program_code: {
    label: 'Program Code',
    type: 'text',
    dbPath: 'programs.code',
    relationPath: ['programs'],
    rootTable: 'applications',
    operators: textOperators,
  },

  // ============================================
  // INVOICES TABLE FIELDS
  // ============================================

  invoice_id: {
    label: 'Invoice ID',
    type: 'text',
    dbPath: 'id',
    rootTable: 'invoices',
    operators: ['eq', 'neq', 'contains', 'in', 'notIn'],
  },

  invoice_number: {
    label: 'Invoice Number',
    type: 'text',
    dbPath: 'invoice_number',
    rootTable: 'invoices',
    operators: textOperators,
  },

  invoice_status: {
    label: 'Invoice Status',
    type: 'enum',
    dbPath: 'status',
    rootTable: 'invoices',
    operators: enumOperators,
    options: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'],
  },

  invoice_issue_date: {
    label: 'Issue Date',
    type: 'date',
    dbPath: 'issue_date',
    rootTable: 'invoices',
    operators: dateOperators,
  },

  invoice_due_date: {
    label: 'Due Date',
    type: 'date',
    dbPath: 'due_date',
    rootTable: 'invoices',
    operators: dateOperators,
  },

  invoice_amount_due: {
    label: 'Amount Due (cents)',
    type: 'number',
    dbPath: 'amount_due_cents',
    rootTable: 'invoices',
    operators: numberOperators,
  },

  invoice_amount_paid: {
    label: 'Amount Paid (cents)',
    type: 'number',
    dbPath: 'amount_paid_cents',
    rootTable: 'invoices',
    operators: numberOperators,
    nullable: true,
  },

  invoice_has_pdf: {
    label: 'Has PDF',
    type: 'boolean',
    dbPath: 'pdf_path',
    rootTable: 'invoices',
    operators: ['isNull', 'isNotNull'], // Special: null = no PDF, not null = has PDF
    nullable: true,
  },

  invoice_last_email_sent_at: {
    label: 'Last Email Sent At',
    type: 'date',
    dbPath: 'last_email_sent_at',
    rootTable: 'invoices',
    operators: dateOperators,
    nullable: true,
  },

  // ============================================
  // INVOICES -> ENROLLMENTS -> PROGRAMS (2 levels deep)
  // ============================================

  invoice_program_id: {
    label: 'Program ID',
    type: 'text',
    dbPath: 'enrollments.programs.id',
    relationPath: ['enrollments', 'programs'],
    rootTable: 'invoices',
    operators: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  },

  invoice_program_name: {
    label: 'Program Name',
    type: 'text',
    dbPath: 'enrollments.programs.name',
    relationPath: ['enrollments', 'programs'],
    rootTable: 'invoices',
    operators: textOperators,
  },

  invoice_program_code: {
    label: 'Program Code',
    type: 'text',
    dbPath: 'enrollments.programs.code',
    relationPath: ['enrollments', 'programs'],
    rootTable: 'invoices',
    operators: textOperators,
  },

  // ============================================
  // INVOICES -> ENROLLMENTS -> STUDENTS (2 levels deep)
  // ============================================

  invoice_student_id: {
    label: 'Student ID',
    type: 'text',
    dbPath: 'enrollments.students.id',
    relationPath: ['enrollments', 'students'],
    rootTable: 'invoices',
    operators: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  },

  invoice_student_name: {
    label: 'Student Name',
    type: 'text',
    dbPath: 'enrollments.students.first_name', // Note: This would need concatenation in real query
    relationPath: ['enrollments', 'students'],
    rootTable: 'invoices',
    operators: textOperators,
  },
};

/**
 * Get all field definitions for a specific root table
 */
export const getFieldsForTable = (rootTable: string): FieldDefinition[] => {
  return Object.values(FILTER_FIELDS).filter(
    (field) => field.rootTable === rootTable
  );
};

/**
 * Get a field definition by ID
 */
export const getFieldDefinition = (
  fieldId: string
): FieldDefinition | undefined => {
  return FILTER_FIELDS[fieldId];
};

/**
 * Get all unique root tables in the domain map
 */
export const getRootTables = (): string[] => {
  const tables = new Set<string>();
  Object.values(FILTER_FIELDS).forEach((field) => {
    tables.add(field.rootTable);
  });
  return Array.from(tables).sort();
};
