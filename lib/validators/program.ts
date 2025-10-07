import { z } from 'zod';

/**
 * Program validation schema (AVETMISS NAT00030)
 */
export const programSchema = z.object({
  code: z.string().min(1, 'Code is required').max(10, 'Max 10 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  nominal_hours: z
    .number()
    .int('Must be an integer')
    .min(0, 'Must be ≥ 0')
    .max(9999, 'Must be ≤ 9999'),
  level_of_education_id: z.string().min(1, 'Required'),
  field_of_education_id: z.string().min(1, 'Required'),
  recognition_id: z.string().min(1, 'Required'),
  vet_flag: z.enum(['Y', 'N']),
  anzsco_id: z.string().max(6, 'Max 6 characters').optional().or(z.literal('')),
  anzsic_id: z.string().max(4, 'Max 4 characters').optional().or(z.literal('')),
});

export type ProgramFormValues = z.infer<typeof programSchema>;
