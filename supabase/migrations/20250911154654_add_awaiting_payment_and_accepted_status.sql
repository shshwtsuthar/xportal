ALTER TABLE sms_op.applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE sms_op.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('Draft','Submitted','AwaitingPayment','Accepted','Approved','Rejected'));