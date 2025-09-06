-- This command makes the link to a staff member optional.
-- It is the key change that enables auth-less development.
ALTER TABLE "sms_op"."applications"
ALTER COLUMN "created_by_staff_id" DROP NOT NULL;