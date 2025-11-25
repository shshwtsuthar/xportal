import { z } from 'zod';

/**
 * Bank information validation schema
 */
export const bankInfoSchema = z.object({
  bank_name: z.string().max(100, 'Max 100 characters').optional(),
  bank_account_name: z.string().max(100, 'Max 100 characters').optional(),
  bank_bsb: z
    .string()
    .regex(/^\d{6}$/, 'BSB must be exactly 6 digits')
    .optional()
    .or(z.literal('')),
  bank_account_number: z
    .string()
    .regex(/^\d+$/, 'Account number must be numeric')
    .max(20, 'Max 20 characters')
    .optional()
    .or(z.literal('')),
});

export type BankInfoFormValues = z.infer<typeof bankInfoSchema>;
