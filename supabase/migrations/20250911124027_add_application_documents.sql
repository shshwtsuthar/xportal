-- 02_add_application_documents.sql
create table if not exists sms_op.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references sms_op.applications(id) on delete cascade,
  path text not null,
  doc_type text not null check (doc_type in ('OFFER_LETTER','COE','EVIDENCE','OTHER')),
  version text null,
  mime_type text null,
  size_bytes bigint null,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_docs_app_id_type
  on sms_op.application_documents(application_id, doc_type);