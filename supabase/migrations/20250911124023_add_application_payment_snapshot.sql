-- 01_add_application_payment_snapshot.sql
alter table sms_op.applications
  add column if not exists payment_snapshot jsonb null,
  add column if not exists selected_payment_template_id uuid null references sms_op.payment_plan_templates(id),
  add column if not exists payment_anchor text null check (payment_anchor in ('OFFER_LETTER','COMMENCEMENT','CUSTOM')),
  add column if not exists payment_anchor_date date null,
  add column if not exists tuition_fee_snapshot numeric(10,2) null,
  add column if not exists agent_commission_rate_snapshot numeric(5,2) null;

create index if not exists idx_app_selected_payment_template_id
  on sms_op.applications(selected_payment_template_id);