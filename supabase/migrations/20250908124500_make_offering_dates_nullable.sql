-- Make start_date and end_date nullable to support rolling intakes
alter table sms_op.course_offerings
  alter column start_date drop not null,
  alter column end_date drop not null;


