BEGIN;

-- Add column_order field to user_table_preferences
ALTER TABLE public.user_table_preferences
ADD COLUMN IF NOT EXISTS column_order text[] DEFAULT NULL;

COMMIT;
