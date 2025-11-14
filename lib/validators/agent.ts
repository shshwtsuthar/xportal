import { z } from 'zod';

/**
 * Agent validation schema for business operations
 */
export const agentSchema = z
  .object({
    name: z.string().min(1, 'Agent name is required'),
    slug: z
      .string()
      .min(1, 'Slug is required')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Lowercase letters, numbers, hyphens only'
      ),
    contact_person: z.string().optional().or(z.literal('')),
    contact_email: z
      .string()
      .email('Must be a valid email')
      .optional()
      .or(z.literal('')),
    contact_phone: z.string().optional().or(z.literal('')),
    commission_rate_percent: z
      .number()
      .min(0, 'Commission rate must be at least 0%')
      .max(100, 'Commission rate cannot exceed 100%'),
    commission_active: z.boolean(),
    commission_start_date: z.string().optional().or(z.literal('')).nullable(),
    commission_end_date: z.string().optional().or(z.literal('')).nullable(),
  })
  .refine(
    (data) => {
      // If both dates are provided, end_date must be >= start_date
      if (data.commission_start_date && data.commission_end_date) {
        const start = new Date(data.commission_start_date);
        const end = new Date(data.commission_end_date);
        return end >= start;
      }
      return true;
    },
    {
      message: 'Commission end date must be on or after start date',
      path: ['commission_end_date'],
    }
  );

export type AgentFormValues = z.infer<typeof agentSchema>;
