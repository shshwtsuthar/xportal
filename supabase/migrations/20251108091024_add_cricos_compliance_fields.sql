-- Add CRICOS compliance fields to applications and student_cricos tables
-- This migration adds all mandatory CRICOS fields required for international student enrollment

-- 1. Add CRICOS fields to applications table
ALTER TABLE public.applications
  -- Passport details (enhanced)
  ADD COLUMN IF NOT EXISTS passport_issue_date DATE,
  ADD COLUMN IF NOT EXISTS passport_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS place_of_birth TEXT,
  
  -- Visa information (enhanced)
  ADD COLUMN IF NOT EXISTS visa_application_office TEXT,
  
  -- Under 18 welfare arrangements
  ADD COLUMN IF NOT EXISTS is_under_18 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS provider_accepting_welfare_responsibility BOOLEAN,
  ADD COLUMN IF NOT EXISTS welfare_start_date DATE,
  
  -- Course details (CRICOS-specific)
  ADD COLUMN IF NOT EXISTS cricos_course_code TEXT,
  ADD COLUMN IF NOT EXISTS course_location TEXT,
  ADD COLUMN IF NOT EXISTS proposed_course_end_date DATE,
  ADD COLUMN IF NOT EXISTS study_load TEXT,
  
  -- Financial information
  ADD COLUMN IF NOT EXISTS initial_prepaid_tuition_fee NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS prepaid_fee_from_date DATE,
  ADD COLUMN IF NOT EXISTS prepaid_fee_to_date DATE,
  ADD COLUMN IF NOT EXISTS total_tuition_fees NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS non_tuition_fees_received NUMERIC(12, 2),
  
  -- OSHC (Overseas Student Health Cover)
  ADD COLUMN IF NOT EXISTS provider_arranged_oshc BOOLEAN,
  ADD COLUMN IF NOT EXISTS oshc_provider_name TEXT,
  ADD COLUMN IF NOT EXISTS oshc_start_date DATE,
  ADD COLUMN IF NOT EXISTS oshc_end_date DATE,
  
  -- English language proficiency (enhanced)
  ADD COLUMN IF NOT EXISTS has_english_test BOOLEAN,
  ADD COLUMN IF NOT EXISTS english_test_type TEXT,
  ADD COLUMN IF NOT EXISTS english_test_date DATE,
  -- Note: ielts_score already exists, keeping it for backward compatibility
  
  -- Previous study in Australia
  ADD COLUMN IF NOT EXISTS has_previous_study_australia BOOLEAN,
  ADD COLUMN IF NOT EXISTS previous_provider_name TEXT,
  ADD COLUMN IF NOT EXISTS completed_previous_course BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_release_letter BOOLEAN,
  
  -- Written agreement and consent
  ADD COLUMN IF NOT EXISTS written_agreement_accepted BOOLEAN,
  ADD COLUMN IF NOT EXISTS written_agreement_date DATE,
  ADD COLUMN IF NOT EXISTS privacy_notice_accepted BOOLEAN;

-- 2. Add corresponding CRICOS fields to student_cricos table
ALTER TABLE public.student_cricos
  -- Passport details (enhanced)
  ADD COLUMN IF NOT EXISTS passport_issue_date DATE,
  ADD COLUMN IF NOT EXISTS passport_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS place_of_birth TEXT,
  
  -- Visa information (enhanced)
  ADD COLUMN IF NOT EXISTS visa_application_office TEXT,
  
  -- Under 18 welfare arrangements
  ADD COLUMN IF NOT EXISTS is_under_18 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS provider_accepting_welfare_responsibility BOOLEAN,
  ADD COLUMN IF NOT EXISTS welfare_start_date DATE,
  
  -- Course details (CRICOS-specific)
  ADD COLUMN IF NOT EXISTS cricos_course_code TEXT,
  ADD COLUMN IF NOT EXISTS course_location TEXT,
  ADD COLUMN IF NOT EXISTS proposed_course_end_date DATE,
  ADD COLUMN IF NOT EXISTS study_load TEXT,
  
  -- Financial information
  ADD COLUMN IF NOT EXISTS initial_prepaid_tuition_fee NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS prepaid_fee_from_date DATE,
  ADD COLUMN IF NOT EXISTS prepaid_fee_to_date DATE,
  ADD COLUMN IF NOT EXISTS total_tuition_fees NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS non_tuition_fees_received NUMERIC(12, 2),
  
  -- OSHC (Overseas Student Health Cover)
  ADD COLUMN IF NOT EXISTS provider_arranged_oshc BOOLEAN,
  ADD COLUMN IF NOT EXISTS oshc_provider_name TEXT,
  ADD COLUMN IF NOT EXISTS oshc_start_date DATE,
  ADD COLUMN IF NOT EXISTS oshc_end_date DATE,
  
  -- English language proficiency (enhanced)
  ADD COLUMN IF NOT EXISTS has_english_test BOOLEAN,
  ADD COLUMN IF NOT EXISTS english_test_type TEXT,
  ADD COLUMN IF NOT EXISTS english_test_date DATE,
  -- Note: ielts_score already exists, keeping it for backward compatibility
  
  -- Previous study in Australia
  ADD COLUMN IF NOT EXISTS has_previous_study_australia BOOLEAN,
  ADD COLUMN IF NOT EXISTS previous_provider_name TEXT,
  ADD COLUMN IF NOT EXISTS completed_previous_course BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_release_letter BOOLEAN,
  
  -- Written agreement and consent
  ADD COLUMN IF NOT EXISTS written_agreement_accepted BOOLEAN,
  ADD COLUMN IF NOT EXISTS written_agreement_date DATE,
  ADD COLUMN IF NOT EXISTS privacy_notice_accepted BOOLEAN;

-- Add comments for documentation
COMMENT ON COLUMN public.applications.passport_issue_date IS 'CRICOS: Passport issue date (DD/MM/YYYY format)';
COMMENT ON COLUMN public.applications.passport_expiry_date IS 'CRICOS: Passport expiry date (DD/MM/YYYY format)';
COMMENT ON COLUMN public.applications.place_of_birth IS 'CRICOS: Place of birth as shown on passport';
COMMENT ON COLUMN public.applications.visa_application_office IS 'CRICOS: Department of Home Affairs office where visa application was made or will be made';
COMMENT ON COLUMN public.applications.is_under_18 IS 'CRICOS: Is student under 18 years at course commencement?';
COMMENT ON COLUMN public.applications.provider_accepting_welfare_responsibility IS 'CRICOS: Is provider accepting responsibility for welfare arrangements (CAAW)?';
COMMENT ON COLUMN public.applications.welfare_start_date IS 'CRICOS: Nominated welfare start date if provider accepting responsibility (DD/MM/YYYY format)';
COMMENT ON COLUMN public.applications.cricos_course_code IS 'CRICOS: Unique identifier for the course registered on CRICOS';
COMMENT ON COLUMN public.applications.course_location IS 'CRICOS: Course location must match registered CRICOS location';
COMMENT ON COLUMN public.applications.proposed_course_end_date IS 'CRICOS: Proposed course end date/expected completion date (DD/MM/YYYY format)';
COMMENT ON COLUMN public.applications.study_load IS 'CRICOS: Study load (full-time minimum 20 scheduled contact hours per week for VET)';
COMMENT ON COLUMN public.applications.initial_prepaid_tuition_fee IS 'CRICOS: Dollar amount received from student BEFORE issuing CoE';
COMMENT ON COLUMN public.applications.prepaid_fee_from_date IS 'CRICOS: Period start date that pre-paid fee relates to (DD/MM/YYYY format)';
COMMENT ON COLUMN public.applications.prepaid_fee_to_date IS 'CRICOS: Period end date that pre-paid fee relates to (DD/MM/YYYY format)';
COMMENT ON COLUMN public.applications.total_tuition_fees IS 'CRICOS: Total dollar amount student must pay for complete course';
COMMENT ON COLUMN public.applications.non_tuition_fees_received IS 'CRICOS: Dollar amount of non-tuition fees received before CoE';
COMMENT ON COLUMN public.applications.provider_arranged_oshc IS 'CRICOS: Did provider arrange OSHC?';
COMMENT ON COLUMN public.applications.oshc_provider_name IS 'CRICOS: OSHC Provider Name (select from approved list: Allianz, BUPA, Medibank, NIB, AHM)';
COMMENT ON COLUMN public.applications.oshc_start_date IS 'CRICOS: OSHC Start Date - must start from date student arrives in Australia or a fortnight before course start date (DD/MM/YYYY format)';
COMMENT ON COLUMN public.applications.oshc_end_date IS 'CRICOS: OSHC End Date - must cover entire visa duration, typically 2-3 months after course end date (DD/MM/YYYY format)';
COMMENT ON COLUMN public.applications.has_english_test IS 'CRICOS: Has student undertaken English language test?';
COMMENT ON COLUMN public.applications.english_test_type IS 'CRICOS: Test Type (IELTS, TOEFL iBT, PTE, Cambridge CAE, OET, or other)';
COMMENT ON COLUMN public.applications.english_test_date IS 'CRICOS: English test date (DD/MM/YYYY format)';
COMMENT ON COLUMN public.applications.has_previous_study_australia IS 'CRICOS: Has student previously studied in Australia?';
COMMENT ON COLUMN public.applications.previous_provider_name IS 'CRICOS: Previous provider name if transferring from another provider';
COMMENT ON COLUMN public.applications.completed_previous_course IS 'CRICOS: Did student complete previous course?';
COMMENT ON COLUMN public.applications.has_release_letter IS 'CRICOS: Does student have release letter?';
COMMENT ON COLUMN public.applications.written_agreement_accepted IS 'CRICOS: Student acknowledgment that they have read and accepted written agreement (mandatory)';
COMMENT ON COLUMN public.applications.written_agreement_date IS 'CRICOS: Date of acceptance (DD/MM/YYYY format)';
COMMENT ON COLUMN public.applications.privacy_notice_accepted IS 'CRICOS: Student acknowledgment of privacy and data sharing notice';

