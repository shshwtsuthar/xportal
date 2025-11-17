import { applicationSchema } from '@/src/lib/applicationSchema';

// Schema for draft saving (allows empty strings for optional fields, validates format only)
// Derived from master schema using .partial() to make all fields optional
export const draftApplicationSchema = applicationSchema.partial();
