import { z } from 'zod';

/**
 * Classroom validation schema
 */
export const classroomSchema = z.object({
  name: z
    .string()
    .min(1, 'Classroom name is required')
    .max(100, 'Max 100 characters'),
  type: z.enum([
    'CLASSROOM',
    'COMPUTER_LAB',
    'WORKSHOP',
    'KITCHEN',
    'MEETING_ROOM',
    'OTHER',
  ]),
  capacity: z.number().int('Must be an integer').min(0, 'Must be ≥ 0'),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'DECOMMISSIONED']),
  description: z.string().max(500, 'Max 500 characters').optional(),
});

export type ClassroomFormValues = z.infer<typeof classroomSchema>;
