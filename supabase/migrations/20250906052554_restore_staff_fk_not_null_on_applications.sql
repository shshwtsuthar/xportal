-- This command restores the non-nullable constraint, ensuring data integrity.
ALTER TABLE "sms_op"."applications"
ALTER COLUMN "created_by_staff_id" SET NOT NULL;