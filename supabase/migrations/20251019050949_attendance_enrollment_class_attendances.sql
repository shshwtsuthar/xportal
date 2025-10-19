create table public.enrollment_class_attendances (
  id uuid primary key default extensions.uuid_generate_v4(),
  enrollment_class_id uuid not null references public.enrollment_classes(id) on delete cascade,
  present boolean,
  marked_by uuid references public.profiles(id),
  marked_at timestamptz not null default now(),
  note text,
  unique(enrollment_class_id)
);

alter table public.enrollment_class_attendances enable row level security;

-- Enable RLS
alter table public.enrollment_class_attendances enable row level security;

-- Read policy: same RTO as the enrollment's student
drop policy if exists "rto-read-attendance" on public.enrollment_class_attendances;
create policy "rto-read-attendance" on public.enrollment_class_attendances
for select
using (
  exists (
    select 1
    from public.enrollment_classes ec
    join public.enrollments e on e.id = ec.enrollment_id
    join public.students s on s.id = e.student_id
    where ec.id = enrollment_class_attendances.enrollment_class_id
      and s.rto_id = public.get_my_rto_id()
  )
);

-- Insert policy: allow insert only if same RTO
drop policy if exists "rto-insert-attendance" on public.enrollment_class_attendances;
create policy "rto-insert-attendance" on public.enrollment_class_attendances
for insert to authenticated
with check (
  exists (
    select 1
    from public.enrollment_classes ec
    join public.enrollments e on e.id = ec.enrollment_id
    join public.students s on s.id = e.student_id
    where ec.id = enrollment_class_attendances.enrollment_class_id
      and s.rto_id = public.get_my_rto_id()
  )
);

-- Update policy: allow update only if same RTO
drop policy if exists "rto-update-attendance" on public.enrollment_class_attendances;
create policy "rto-update-attendance" on public.enrollment_class_attendances
for update to authenticated
using (
  exists (
    select 1
    from public.enrollment_classes ec
    join public.enrollments e on e.id = ec.enrollment_id
    join public.students s on s.id = e.student_id
    where ec.id = enrollment_class_attendances.enrollment_class_id
      and s.rto_id = public.get_my_rto_id()
  )
)
with check (
  exists (
    select 1
    from public.enrollment_classes ec
    join public.enrollments e on e.id = ec.enrollment_id
    join public.students s on s.id = e.student_id
    where ec.id = enrollment_class_attendances.enrollment_class_id
      and s.rto_id = public.get_my_rto_id()
  )
);