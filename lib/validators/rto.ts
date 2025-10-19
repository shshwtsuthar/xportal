import { z } from 'zod';

/**
 * RTO validation schema
 */
export const rtoSchema = z.object({
  name: z
    .string()
    .min(1, 'RTO name is required')
    .max(100, 'Max 100 characters'),
  rto_code: z
    .string()
    .min(1, 'RTO code is required')
    .max(10, 'Max 10 characters'),
  address_line_1: z.string().max(100, 'Max 100 characters').optional(),
  suburb: z.string().max(50, 'Max 50 characters').optional(),
  state: z
    .enum(['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'])
    .optional(),
  postcode: z
    .string()
    .length(4, 'Postcode must be exactly 4 digits')
    .regex(/^\d{4}$/, 'Must be numeric')
    .optional()
    .or(z.literal('')),
  type_identifier: z.string().max(20, 'Max 20 characters').optional(),
  phone_number: z.string().max(20, 'Max 20 characters').optional(),
  facsimile_number: z.string().max(20, 'Max 20 characters').optional(),
  email_address: z
    .string()
    .email('Invalid email address')
    .max(100, 'Max 100 characters')
    .optional()
    .or(z.literal('')),
  contact_name: z.string().max(50, 'Max 50 characters').optional(),
  statistical_area_1_id: z.string().max(10, 'Max 10 characters').optional(),
  statistical_area_2_id: z.string().max(10, 'Max 10 characters').optional(),
});

export type RtoFormValues = z.infer<typeof rtoSchema>;
