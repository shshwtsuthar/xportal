-- Add STUDENT role to user_role enum
-- This allows students to have a distinct role from staff members

BEGIN;

-- Add STUDENT to the user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'STUDENT';

COMMENT ON TYPE public.user_role IS 'User roles in the system. STUDENT is for student portal users, all other roles are for staff members.';

COMMIT;

