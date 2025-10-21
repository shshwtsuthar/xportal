import { z } from 'zod';

/**
 * Agent validation schema for business operations
 */
export const agentSchema = z.object({
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
});

export type AgentFormValues = z.infer<typeof agentSchema>;
