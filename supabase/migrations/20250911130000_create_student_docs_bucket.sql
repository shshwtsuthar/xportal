-- Ensure private bucket for student/application documents exists
-- Bucket: student-docs (private)

insert into storage.buckets (id, name, public)
values ('student-docs', 'student-docs', false)
on conflict (id) do nothing;


