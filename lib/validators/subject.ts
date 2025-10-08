import { z } from 'zod';

/**
 * Subject validation schema (AVETMISS NAT00060)
 */
export const subjectSchema = z.object({
  code: z.string().min(1, 'Code is required').max(12, 'Max 12 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  nominal_hours: z
    .number()
    .int('Must be an integer')
    .min(0, 'Must be ≥ 0')
    .max(9999, 'Must be ≤ 9999'),
  field_of_education_id: z
    .string()
    .min(6, 'Must be 6 characters')
    .max(6, 'Must be 6 characters'),
  vet_flag: z.enum(['Y', 'N']),
});

export type SubjectFormValues = z.infer<typeof subjectSchema>;
