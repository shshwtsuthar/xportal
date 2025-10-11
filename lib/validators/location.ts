import { z } from 'zod';

/**
 * Location validation schema (AVETMISS NAT00020)
 */
export const locationSchema = z.object({
  location_id_internal: z
    .string()
    .min(1, 'Location ID is required')
    .max(10, 'Max 10 characters'),
  name: z
    .string()
    .min(1, 'Location name is required')
    .max(100, 'Max 100 characters'),
  building_property_name: z.string().max(50, 'Max 50 characters').optional(),
  flat_unit_details: z.string().max(30, 'Max 30 characters').optional(),
  street_number: z.string().max(15, 'Max 15 characters').optional(),
  street_name: z
    .string()
    .min(1, 'Street name is required')
    .max(70, 'Max 70 characters'),
  suburb: z.string().min(1, 'Suburb is required').max(50, 'Max 50 characters'),
  state: z.enum(['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']),
  postcode: z
    .string()
    .length(4, 'Postcode must be exactly 4 digits')
    .regex(/^\d{4}$/, 'Must be numeric'),
});

export type LocationFormValues = z.infer<typeof locationSchema>;
