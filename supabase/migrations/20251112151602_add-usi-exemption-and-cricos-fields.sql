-- Add AVETMISS USI Exemption + CRICOS Visa Fields
-- This migration adds missing fields required by the New Application Wizard (AVETMISS step and CRICOS step).
-- All columns are added as NULLable to avoid breaking existing data.

alter table if exists public.applications
  add column if not exists usi_exemption_flag boolean null,
  add column if not exists usi_exemption_code text null,
  add column if not exists usi_exemption_evidence_path text null,
  add column if not exists usi_status_verified_at timestamptz null;

-- applications: CRICOS visa fields (hold visa flag and key dates)
alter table if exists public.applications
  add column if not exists holds_visa boolean null,
  add column if not exists visa_grant_date date null,
  add column if not exists visa_expiry_date date null,
  add column if not exists oshc_policy_number text null,
  add column if not exists coe_number text null;

-- student_avetmiss: AVETMISS USI exemption fields (persisted on student)
alter table if exists public.student_avetmiss
  add column if not exists usi_exemption_flag boolean null,
  add column if not exists usi_exemption_code text null,
  add column if not exists usi_exemption_evidence_path text null,
  add column if not exists usi_status_verified_at timestamptz null;

-- student_cricos: CRICOS visa fields (persisted on student)
alter table if exists public.student_cricos
  add column if not exists holds_visa boolean null,
  add column if not exists visa_grant_date date null,
  add column if not exists visa_expiry_date date null,
  add column if not exists oshc_policy_number text null,
  add column if not exists coe_number text null;


