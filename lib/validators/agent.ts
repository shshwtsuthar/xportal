import { z } from 'zod';

/**
 * Agent validation schema for business operations
 */
export const agentSchema = z.object({
  name: z.string().min(1, 'Agent name is required'),
  contact_person: z.string().optional().or(z.literal('')),
  contact_email: z
    .string()
    .email('Must be a valid email')
    .optional()
    .or(z.literal('')),
  contact_phone: z.string().optional().or(z.literal('')),
});

export type AgentFormValues = z.infer<typeof agentSchema>;
