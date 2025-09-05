

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "avetmiss";


ALTER SCHEMA "avetmiss" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "avetmiss_submissions";


ALTER SCHEMA "avetmiss_submissions" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "core";


ALTER SCHEMA "core" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "cricos";


ALTER SCHEMA "cricos" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "security";


ALTER SCHEMA "security" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "sms_op";


ALTER SCHEMA "sms_op" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "security"."user_role" AS ENUM (
    'Admin',
    'Trainer',
    'Student'
);


ALTER TYPE "security"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core"."log_client_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- We check each sensitive column. If it has been changed, we log it.
    IF OLD.first_name IS DISTINCT FROM NEW.first_name THEN
        INSERT INTO core.clients_audit(client_id, changed_column, old_value, new_value)
        VALUES(OLD.id, 'first_name', OLD.first_name, NEW.first_name);
    END IF;
    IF OLD.last_name IS DISTINCT FROM NEW.last_name THEN
        INSERT INTO core.clients_audit(client_id, changed_column, old_value, new_value)
        VALUES(OLD.id, 'last_name', OLD.last_name, NEW.last_name);
    END IF;
    IF OLD.date_of_birth IS DISTINCT FROM NEW.date_of_birth THEN
        INSERT INTO core.clients_audit(client_id, changed_column, old_value, new_value)
        VALUES(OLD.id, 'date_of_birth', OLD.date_of_birth::text, NEW.date_of_birth::text);
    END IF;
    IF OLD.unique_student_identifier IS DISTINCT FROM NEW.unique_student_identifier THEN
        INSERT INTO core.clients_audit(client_id, changed_column, old_value, new_value)
        VALUES(OLD.id, 'unique_student_identifier', OLD.unique_student_identifier, NEW.unique_student_identifier);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "core"."log_client_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "sms_op"."check_trainer_availability"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    conflict_exists BOOLEAN;
BEGIN
    -- This query checks if the trainer being added (NEW.staff_id) is already
    -- assigned to another session that overlaps in time with the session
    -- they are being assigned to (NEW.session_id).
    SELECT EXISTS (
        SELECT 1
        FROM sms_op.session_trainers st
        JOIN sms_op.sessions s ON st.session_id = s.id
        WHERE
            st.staff_id = NEW.staff_id
            AND st.session_id != NEW.session_id -- Exclude the very session we are modifying
            AND tstzrange(
                (SELECT start_time FROM sms_op.sessions WHERE id = NEW.session_id),
                (SELECT end_time FROM sms_op.sessions WHERE id = NEW.session_id)
            ) && tstzrange(s.start_time, s.end_time) -- The '&&' operator checks for overlap
    ) INTO conflict_exists;

    IF conflict_exists THEN
        RAISE EXCEPTION 'Constraint violation: Trainer is already scheduled for an overlapping session.';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "sms_op"."check_trainer_availability"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "sms_op"."log_outcome_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO sms_op.outcomes_audit(outcome_id, enrolment_id, subject_id, old_outcome_identifier, new_outcome_identifier, old_end_date, new_end_date)
        VALUES(OLD.id, OLD.enrolment_id, OLD.subject_id, OLD.outcome_identifier_national, NEW.outcome_identifier_national, OLD.end_date, NEW.end_date);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO sms_op.outcomes_audit(outcome_id, enrolment_id, subject_id, new_outcome_identifier, new_end_date)
        VALUES(NEW.id, NEW.enrolment_id, NEW.subject_id, NEW.outcome_identifier_national, NEW.end_date);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "sms_op"."log_outcome_changes"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "avetmiss"."client_avetmiss_details" (
    "client_id" "uuid" NOT NULL,
    "highest_school_level_completed_identifier" character varying NOT NULL,
    "indigenous_status_identifier" character varying NOT NULL,
    "language_identifier" character varying NOT NULL,
    "labour_force_status_identifier" character varying NOT NULL,
    "disability_flag" character varying DEFAULT 'N'::character varying NOT NULL,
    "prior_educational_achievement_flag" character varying DEFAULT 'N'::character varying NOT NULL,
    "at_school_flag" character varying DEFAULT 'N'::character varying NOT NULL,
    "survey_contact_status" character varying
);


ALTER TABLE "avetmiss"."client_avetmiss_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "avetmiss"."client_disabilities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "disability_type_identifier" character varying NOT NULL
);


ALTER TABLE "avetmiss"."client_disabilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "avetmiss"."client_prior_achievements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "prior_educational_achievement_identifier" character varying NOT NULL
);


ALTER TABLE "avetmiss"."client_prior_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "avetmiss"."codes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code_type" character varying NOT NULL,
    "code_value" character varying NOT NULL,
    "code_description" character varying NOT NULL,
    "avetmiss_version" character varying DEFAULT '8.0'::character varying,
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "avetmiss"."codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "avetmiss"."program_avetmiss_details" (
    "program_id" "uuid" NOT NULL,
    "nominal_hours" integer NOT NULL,
    "program_recognition_identifier" character varying,
    "program_level_of_education_identifier" character varying,
    "program_field_of_education_identifier" character varying,
    "anzsco_identifier" character varying,
    "vet_flag" character varying
);


ALTER TABLE "avetmiss"."program_avetmiss_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "avetmiss"."program_completions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "training_organisation_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "date_program_completed" "date" NOT NULL,
    "issued_flag" character varying NOT NULL,
    "parchment_issue_date" "date",
    "parchment_number" character varying
);


ALTER TABLE "avetmiss"."program_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "avetmiss"."subject_avetmiss_details" (
    "subject_id" "uuid" NOT NULL,
    "subject_field_of_education_identifier" character varying,
    "vet_flag" character varying,
    "nominal_hours" integer
);


ALTER TABLE "avetmiss"."subject_avetmiss_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "avetmiss"."training_activities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "training_organisation_id" "uuid" NOT NULL,
    "delivery_location_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "program_id" "uuid",
    "activity_start_date" "date" NOT NULL,
    "activity_end_date" "date" NOT NULL,
    "delivery_mode_identifier" character varying NOT NULL,
    "outcome_identifier_national" character varying NOT NULL,
    "funding_source_national" character varying NOT NULL,
    "commencing_program_identifier" character varying,
    "training_contract_identifier" character varying,
    "client_identifier_apprenticeships" character varying,
    "study_reason_identifier" character varying,
    "vet_in_schools_flag" character varying DEFAULT 'N'::character varying NOT NULL,
    "specific_funding_identifier" character varying,
    "school_type_identifier" character varying,
    "state_specific_data" "jsonb"
);


ALTER TABLE "avetmiss"."training_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "avetmiss_submissions"."snapshot_nat00010" (
    "submission_id" "uuid" NOT NULL,
    "training_organisation_identifier" character varying,
    "training_organisation_name" character varying
);


ALTER TABLE "avetmiss_submissions"."snapshot_nat00010" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "avetmiss_submissions"."snapshot_nat00020" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "training_organisation_identifier" character varying,
    "training_organisation_delivery_location_identifier" character varying,
    "training_organisation_delivery_location_name" character varying,
    "postcode" character varying,
    "state_identifier" character varying,
    "suburb" character varying,
    "country_identifier" character varying
);


ALTER TABLE "avetmiss_submissions"."snapshot_nat00020" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "avetmiss_submissions"."snapshot_nat00120" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "training_organisation_identifier" character varying,
    "client_identifier" character varying,
    "subject_identifier" character varying,
    "program_identifier" character varying,
    "activity_start_date" character varying(8),
    "activity_end_date" character varying(8),
    "delivery_mode_identifier" character varying,
    "outcome_identifier_national" character varying,
    "funding_source_national" character varying
);


ALTER TABLE "avetmiss_submissions"."snapshot_nat00120" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "avetmiss_submissions"."submissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "reporting_year" integer NOT NULL,
    "submission_type" "text" DEFAULT 'Original'::"text" NOT NULL,
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "submitted_at" timestamp with time zone,
    "amends_submission_id" "uuid",
    "avs_error_report_url" "text",
    "contact_staff_id" "uuid"
);


ALTER TABLE "avetmiss_submissions"."submissions" OWNER TO "postgres";


COMMENT ON COLUMN "avetmiss_submissions"."submissions"."amends_submission_id" IS 'If this is a correction, this points to the submission ID it replaces.';



COMMENT ON COLUMN "avetmiss_submissions"."submissions"."avs_error_report_url" IS 'URL/path to the uploaded AVS error report for this submission draft.';



CREATE TABLE IF NOT EXISTS "core"."addresses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "address_line_1" character varying,
    "address_line_2" character varying,
    "building_property_name" character varying,
    "flat_unit_details" character varying,
    "street_number" character varying,
    "street_name" character varying,
    "suburb" character varying NOT NULL,
    "postcode" character varying NOT NULL,
    "state_identifier" character varying NOT NULL,
    "country_identifier" character varying DEFAULT '1101'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sa1_identifier" character varying,
    "sa2_identifier" character varying
);


ALTER TABLE "core"."addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core"."agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_name" "text" NOT NULL,
    "agent_type" "text" NOT NULL,
    "abn" character varying(11),
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "primary_contact_name" "text",
    "primary_contact_email" "text" NOT NULL,
    "primary_contact_phone" "text",
    "address_id" "uuid",
    "agreement_start_date" "date",
    "agreement_end_date" "date",
    "commission_rate" numeric(5,2) DEFAULT 0.00,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "agents_agent_type_check" CHECK (("agent_type" = ANY (ARRAY['ORGANISATION'::"text", 'INDIVIDUAL'::"text"]))),
    CONSTRAINT "agents_commission_rate_check" CHECK ((("commission_rate" >= (0)::numeric) AND ("commission_rate" <= (100)::numeric))),
    CONSTRAINT "agents_status_check" CHECK (("status" = ANY (ARRAY['Active'::"text", 'Inactive'::"text", 'Pending'::"text"])))
);


ALTER TABLE "core"."agents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core"."client_addresses" (
    "client_id" "uuid" NOT NULL,
    "address_id" "uuid" NOT NULL,
    "address_type" character varying NOT NULL,
    CONSTRAINT "chk_address_type" CHECK ((("address_type")::"text" = ANY ((ARRAY['POSTAL'::character varying, 'HOME'::character varying, 'WORK'::character varying, 'OTHER'::character varying])::"text"[])))
);


ALTER TABLE "core"."client_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core"."client_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "staff_id" "uuid",
    "note" "text" NOT NULL,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "core"."client_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core"."clients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "client_identifier" character varying NOT NULL,
    "unique_student_identifier" character varying(10),
    "first_name" character varying NOT NULL,
    "middle_name" character varying,
    "last_name" character varying NOT NULL,
    "date_of_birth" "date" NOT NULL,
    "gender" character varying NOT NULL,
    "country_of_birth_identifier" character varying,
    "primary_email" character varying,
    "primary_phone" character varying,
    "usi_verification_status" character varying DEFAULT 'Unverified'::character varying,
    "usi_verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "title" character varying
);


ALTER TABLE "core"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core"."clients_audit" (
    "id" bigint NOT NULL,
    "client_id" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by_staff_id" "uuid",
    "changed_column" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text"
);


ALTER TABLE "core"."clients_audit" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "core"."clients_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "core"."clients_audit_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "core"."clients_audit_id_seq" OWNED BY "core"."clients_audit"."id";



CREATE TABLE IF NOT EXISTS "core"."locations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "location_identifier" character varying NOT NULL,
    "location_name" character varying NOT NULL,
    "address_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "core"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core"."organisations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organisation_identifier" character varying NOT NULL,
    "organisation_name" character varying NOT NULL,
    "organisation_type_identifier" character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "state_identifier" character varying(3) DEFAULT 'VIC'::character varying NOT NULL
);


ALTER TABLE "core"."organisations" OWNER TO "postgres";


COMMENT ON COLUMN "core"."organisations"."state_identifier" IS 'AVETMISS State Identifier (e.g., VIC, NSW). Governs state-specific reporting logic.';



CREATE TABLE IF NOT EXISTS "core"."program_subjects" (
    "program_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "unit_type" "text" NOT NULL,
    "elective_group" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "program_subjects_unit_type_check" CHECK (("unit_type" = ANY (ARRAY['Core'::"text", 'Elective'::"text"])))
);


ALTER TABLE "core"."program_subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core"."programs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "program_identifier" character varying NOT NULL,
    "program_name" character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'Current'::"text" NOT NULL,
    "tga_url" "text",
    CONSTRAINT "programs_status_check" CHECK (("status" = ANY (ARRAY['Current'::"text", 'Superseded'::"text", 'Archived'::"text"])))
);


ALTER TABLE "core"."programs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core"."subjects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "subject_identifier" character varying NOT NULL,
    "subject_name" character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'Current'::"text" NOT NULL,
    "tga_url" "text",
    CONSTRAINT "subjects_status_check" CHECK (("status" = ANY (ARRAY['Current'::"text", 'Superseded'::"text", 'Archived'::"text"])))
);


ALTER TABLE "core"."subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "cricos"."client_details" (
    "client_id" "uuid" NOT NULL,
    "country_of_citizenship_id" character varying(4) NOT NULL,
    "passport_number" character varying(255) NOT NULL,
    "passport_expiry_date" "date" NOT NULL,
    "visa_subclass" character varying(10),
    "visa_grant_number" character varying(255),
    "visa_expiry_date" "date",
    "oshc_provider" "text",
    "oshc_policy_number" character varying(255),
    "oshc_paid_to_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "cricos"."client_details" OWNER TO "postgres";


COMMENT ON COLUMN "cricos"."client_details"."passport_number" IS 'CRITICAL PII. This data MUST be encrypted at the application layer before being stored.';



CREATE TABLE IF NOT EXISTS "cricos"."confirmations_of_enrolment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coe_identifier" character varying(20),
    "enrolment_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "course_start_date" "date" NOT NULL,
    "course_end_date" "date" NOT NULL,
    "total_tuition_fee" numeric(10,2) NOT NULL,
    "prepaid_fees" numeric(10,2) NOT NULL,
    "prisms_payload" "jsonb",
    "issued_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancellation_reason_code" character varying(10),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_coe_status" CHECK (("status" = ANY (ARRAY['Draft'::"text", 'Issued'::"text", 'Studying'::"text", 'Cancelled'::"text", 'Finished'::"text"]))),
    CONSTRAINT "check_prepaid_fees_non_negative" CHECK (("prepaid_fees" >= (0)::numeric))
);


ALTER TABLE "cricos"."confirmations_of_enrolment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "security"."roles" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "security"."roles" OWNER TO "postgres";


COMMENT ON TABLE "security"."roles" IS 'Defines user roles, e.g., Admin, Trainer, Student.';



CREATE SEQUENCE IF NOT EXISTS "security"."roles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "security"."roles_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "security"."roles_id_seq" OWNED BY "security"."roles"."id";



CREATE TABLE IF NOT EXISTS "security"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role_id" bigint NOT NULL
);


ALTER TABLE "security"."user_roles" OWNER TO "postgres";


COMMENT ON TABLE "security"."user_roles" IS 'Assigns roles to users.';



CREATE TABLE IF NOT EXISTS "security"."users" (
    "id" "uuid" NOT NULL,
    "client_id" "uuid",
    "staff_id" "uuid",
    "full_name" "text",
    "avatar_url" "text"
);


ALTER TABLE "security"."users" OWNER TO "postgres";


COMMENT ON TABLE "security"."users" IS 'User profile data, linked to Supabase auth.users.';



CREATE TABLE IF NOT EXISTS "sms_op"."agent_commissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "commission_rate_snapshot" numeric(5,2) NOT NULL,
    "commission_amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'Payable'::"text" NOT NULL,
    "paid_date" "date",
    CONSTRAINT "agent_commissions_status_check" CHECK (("status" = ANY (ARRAY['Payable'::"text", 'Paid'::"text", 'Void'::"text"])))
);


ALTER TABLE "sms_op"."agent_commissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "application_payload" "jsonb",
    "created_client_id" "uuid",
    "created_enrolment_id" "uuid",
    "created_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "applications_status_check" CHECK (("status" = ANY (ARRAY['Draft'::"text", 'Submitted'::"text", 'Approved'::"text", 'Rejected'::"text"])))
);


ALTER TABLE "sms_op"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."assessment_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assessment_task_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "submission_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "grade" "text",
    "graded_by_staff_id" "uuid",
    "graded_at" timestamp with time zone,
    "feedback" "text",
    CONSTRAINT "assessment_submissions_grade_check" CHECK (("grade" = ANY (ARRAY['C'::"text", 'NYC'::"text"])))
);


ALTER TABLE "sms_op"."assessment_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."assessment_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "due_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "sms_op"."assessment_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."course_offerings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "trainer_id" "uuid",
    "delivery_location_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'Scheduled'::"text" NOT NULL,
    "max_students" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "sms_op"."course_offerings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."enrolment_subject_outcomes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrolment_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "outcome_identifier_national" character varying(3) NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "recorded_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "sms_op"."enrolment_subject_outcomes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."enrolment_subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrolment_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "unit_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "enrolment_subjects_unit_type_check" CHECK (("unit_type" = ANY (ARRAY['Core'::"text", 'Elective'::"text"])))
);


ALTER TABLE "sms_op"."enrolment_subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."enrolments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "course_offering_id" "uuid" NOT NULL,
    "enrolment_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "withdrawal_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "agent_id" "uuid",
    "agent_commission_rate_snapshot" numeric(5,2),
    "tuition_fee_snapshot" numeric(10,2),
    "deferral_start_date" "date",
    "deferral_end_date" "date",
    CONSTRAINT "enrolments_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Active'::"text", 'Withdrawn'::"text", 'Completed'::"text", 'Deferred'::"text", 'Suspended'::"text"])))
);


ALTER TABLE "sms_op"."enrolments" OWNER TO "postgres";


COMMENT ON COLUMN "sms_op"."enrolments"."agent_commission_rate_snapshot" IS 'The agent''s commission rate at the exact moment of enrolment, frozen in time.';



COMMENT ON COLUMN "sms_op"."enrolments"."tuition_fee_snapshot" IS 'The total tuition fee for this enrolment at the moment it was created, frozen in time.';



CREATE TABLE IF NOT EXISTS "sms_op"."invoice_line_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    CONSTRAINT "check_line_item_prices" CHECK ((("unit_price" >= (0)::numeric) AND ("total_price" >= (0)::numeric)))
);


ALTER TABLE "sms_op"."invoice_line_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."invoices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "enrolment_id" "uuid" NOT NULL,
    "invoice_number" "text" NOT NULL,
    "issue_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "due_date" "date" NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "amount_paid" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "notes" "text",
    CONSTRAINT "check_invoice_status" CHECK (("status" = ANY (ARRAY['Draft'::"text", 'Issued'::"text", 'Paid'::"text", 'Partially Paid'::"text", 'Overdue'::"text", 'Void'::"text"])))
);


ALTER TABLE "sms_op"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."outcomes_audit" (
    "id" bigint NOT NULL,
    "outcome_id" "uuid" NOT NULL,
    "enrolment_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by_staff_id" "uuid",
    "old_outcome_identifier" "text",
    "new_outcome_identifier" "text",
    "old_end_date" "date",
    "new_end_date" "date"
);


ALTER TABLE "sms_op"."outcomes_audit" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "sms_op"."outcomes_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "sms_op"."outcomes_audit_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "sms_op"."outcomes_audit_id_seq" OWNED BY "sms_op"."outcomes_audit"."id";



CREATE TABLE IF NOT EXISTS "sms_op"."payment_plan_instalments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_plan_id" "uuid" NOT NULL,
    "due_date" "date" NOT NULL,
    "amount_due" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "generated_invoice_id" "uuid",
    CONSTRAINT "payment_plan_instalments_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Generated'::"text"])))
);


ALTER TABLE "sms_op"."payment_plan_instalments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."payment_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrolment_id" "uuid" NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "number_of_instalments" integer NOT NULL,
    "frequency" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    CONSTRAINT "payment_plans_frequency_check" CHECK (("frequency" = ANY (ARRAY['Weekly'::"text", 'Fortnightly'::"text", 'Monthly'::"text"]))),
    CONSTRAINT "payment_plans_status_check" CHECK (("status" = ANY (ARRAY['Active'::"text", 'Completed'::"text", 'Cancelled'::"text"])))
);


ALTER TABLE "sms_op"."payment_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "payment_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "payment_method" "text" NOT NULL,
    "transaction_reference" "text",
    "notes" "text",
    "recorded_by_staff_id" "uuid",
    CONSTRAINT "check_payment_amount_positive" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "payments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['Credit Card'::"text", 'Bank Transfer'::"text", 'Cash'::"text", 'Other'::"text"])))
);


ALTER TABLE "sms_op"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."refunds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "refund_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "refund_method" "text",
    "reason" "text",
    "processed_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "refunds_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "sms_op"."refunds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."session_attendance" (
    "session_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "notes" "text",
    "recorded_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "session_attendance_status_check" CHECK (("status" = ANY (ARRAY['Present'::"text", 'Absent'::"text", 'Late'::"text", 'Excused'::"text"])))
);


ALTER TABLE "sms_op"."session_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."session_trainers" (
    "session_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "is_lead_trainer" boolean DEFAULT false NOT NULL
);


ALTER TABLE "sms_op"."session_trainers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_offering_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'Scheduled'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_session_times" CHECK (("end_time" > "start_time")),
    CONSTRAINT "sessions_status_check" CHECK (("status" = ANY (ARRAY['Scheduled'::"text", 'Completed'::"text", 'Cancelled'::"text"])))
);


ALTER TABLE "sms_op"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sms_op"."staff" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "staff_number" "text",
    "position" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "sms_op"."staff" OWNER TO "postgres";


ALTER TABLE ONLY "core"."clients_audit" ALTER COLUMN "id" SET DEFAULT "nextval"('"core"."clients_audit_id_seq"'::"regclass");



ALTER TABLE ONLY "security"."roles" ALTER COLUMN "id" SET DEFAULT "nextval"('"security"."roles_id_seq"'::"regclass");



ALTER TABLE ONLY "sms_op"."outcomes_audit" ALTER COLUMN "id" SET DEFAULT "nextval"('"sms_op"."outcomes_audit_id_seq"'::"regclass");



ALTER TABLE ONLY "avetmiss"."client_avetmiss_details"
    ADD CONSTRAINT "client_avetmiss_details_pkey" PRIMARY KEY ("client_id");



ALTER TABLE ONLY "avetmiss"."client_disabilities"
    ADD CONSTRAINT "client_disabilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "avetmiss"."client_prior_achievements"
    ADD CONSTRAINT "client_prior_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "avetmiss"."codes"
    ADD CONSTRAINT "codes_code_type_code_value_key" UNIQUE ("code_type", "code_value");



ALTER TABLE ONLY "avetmiss"."codes"
    ADD CONSTRAINT "codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "avetmiss"."program_avetmiss_details"
    ADD CONSTRAINT "program_avetmiss_details_pkey" PRIMARY KEY ("program_id");



ALTER TABLE ONLY "avetmiss"."program_completions"
    ADD CONSTRAINT "program_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "avetmiss"."subject_avetmiss_details"
    ADD CONSTRAINT "subject_avetmiss_details_pkey" PRIMARY KEY ("subject_id");



ALTER TABLE ONLY "avetmiss"."training_activities"
    ADD CONSTRAINT "training_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "avetmiss_submissions"."snapshot_nat00010"
    ADD CONSTRAINT "snapshot_nat00010_pkey" PRIMARY KEY ("submission_id");



ALTER TABLE ONLY "avetmiss_submissions"."snapshot_nat00020"
    ADD CONSTRAINT "snapshot_nat00020_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "avetmiss_submissions"."snapshot_nat00120"
    ADD CONSTRAINT "snapshot_nat00120_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "avetmiss_submissions"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core"."agents"
    ADD CONSTRAINT "agents_abn_key" UNIQUE ("abn");



ALTER TABLE ONLY "core"."agents"
    ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core"."client_addresses"
    ADD CONSTRAINT "client_addresses_pkey" PRIMARY KEY ("client_id", "address_id");



ALTER TABLE ONLY "core"."client_notes"
    ADD CONSTRAINT "client_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core"."clients_audit"
    ADD CONSTRAINT "clients_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core"."clients"
    ADD CONSTRAINT "clients_client_identifier_key" UNIQUE ("client_identifier");



ALTER TABLE ONLY "core"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core"."clients"
    ADD CONSTRAINT "clients_primary_email_key" UNIQUE ("primary_email");



ALTER TABLE ONLY "core"."clients"
    ADD CONSTRAINT "clients_unique_student_identifier_key" UNIQUE ("unique_student_identifier");



ALTER TABLE ONLY "core"."locations"
    ADD CONSTRAINT "locations_organisation_id_location_identifier_key" UNIQUE ("organisation_id", "location_identifier");



ALTER TABLE ONLY "core"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core"."organisations"
    ADD CONSTRAINT "organisations_organisation_identifier_key" UNIQUE ("organisation_identifier");



ALTER TABLE ONLY "core"."organisations"
    ADD CONSTRAINT "organisations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core"."program_subjects"
    ADD CONSTRAINT "program_subjects_pkey" PRIMARY KEY ("program_id", "subject_id");



ALTER TABLE ONLY "core"."programs"
    ADD CONSTRAINT "programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core"."programs"
    ADD CONSTRAINT "programs_program_identifier_key" UNIQUE ("program_identifier");



ALTER TABLE ONLY "core"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core"."subjects"
    ADD CONSTRAINT "subjects_subject_identifier_key" UNIQUE ("subject_identifier");



ALTER TABLE ONLY "cricos"."client_details"
    ADD CONSTRAINT "client_details_pkey" PRIMARY KEY ("client_id");



ALTER TABLE ONLY "cricos"."confirmations_of_enrolment"
    ADD CONSTRAINT "confirmations_of_enrolment_coe_identifier_key" UNIQUE ("coe_identifier");



ALTER TABLE ONLY "cricos"."confirmations_of_enrolment"
    ADD CONSTRAINT "confirmations_of_enrolment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "security"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "security"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "security"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id");



ALTER TABLE ONLY "security"."users"
    ADD CONSTRAINT "users_client_id_key" UNIQUE ("client_id");



ALTER TABLE ONLY "security"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "security"."users"
    ADD CONSTRAINT "users_staff_id_key" UNIQUE ("staff_id");



ALTER TABLE ONLY "sms_op"."agent_commissions"
    ADD CONSTRAINT "agent_commissions_payment_id_key" UNIQUE ("payment_id");



ALTER TABLE ONLY "sms_op"."agent_commissions"
    ADD CONSTRAINT "agent_commissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."applications"
    ADD CONSTRAINT "applications_created_client_id_key" UNIQUE ("created_client_id");



ALTER TABLE ONLY "sms_op"."applications"
    ADD CONSTRAINT "applications_created_enrolment_id_key" UNIQUE ("created_enrolment_id");



ALTER TABLE ONLY "sms_op"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."assessment_submissions"
    ADD CONSTRAINT "assessment_submissions_assessment_task_id_client_id_attempt_key" UNIQUE ("assessment_task_id", "client_id", "attempt_number");



ALTER TABLE ONLY "sms_op"."assessment_submissions"
    ADD CONSTRAINT "assessment_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."assessment_tasks"
    ADD CONSTRAINT "assessment_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."course_offerings"
    ADD CONSTRAINT "course_offerings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."enrolment_subject_outcomes"
    ADD CONSTRAINT "enrolment_subject_outcomes_enrolment_id_subject_id_key" UNIQUE ("enrolment_id", "subject_id");



ALTER TABLE ONLY "sms_op"."enrolment_subject_outcomes"
    ADD CONSTRAINT "enrolment_subject_outcomes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."enrolment_subjects"
    ADD CONSTRAINT "enrolment_subjects_enrolment_id_subject_id_key" UNIQUE ("enrolment_id", "subject_id");



ALTER TABLE ONLY "sms_op"."enrolment_subjects"
    ADD CONSTRAINT "enrolment_subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."enrolments"
    ADD CONSTRAINT "enrolments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "sms_op"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."outcomes_audit"
    ADD CONSTRAINT "outcomes_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."payment_plan_instalments"
    ADD CONSTRAINT "payment_plan_instalments_generated_invoice_id_key" UNIQUE ("generated_invoice_id");



ALTER TABLE ONLY "sms_op"."payment_plan_instalments"
    ADD CONSTRAINT "payment_plan_instalments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."payment_plans"
    ADD CONSTRAINT "payment_plans_enrolment_id_key" UNIQUE ("enrolment_id");



ALTER TABLE ONLY "sms_op"."payment_plans"
    ADD CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."refunds"
    ADD CONSTRAINT "refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."session_attendance"
    ADD CONSTRAINT "session_attendance_pkey" PRIMARY KEY ("session_id", "client_id");



ALTER TABLE ONLY "sms_op"."sessions"
    ADD CONSTRAINT "session_location_overlap_check" EXCLUDE USING "gist" ("location_id" WITH =, "tstzrange"("start_time", "end_time") WITH &&) WHERE (("location_id" IS NOT NULL));



COMMENT ON CONSTRAINT "session_location_overlap_check" ON "sms_op"."sessions" IS 'Prevents two sessions from being scheduled in the same location at overlapping times.';



ALTER TABLE ONLY "sms_op"."session_trainers"
    ADD CONSTRAINT "session_trainers_pkey" PRIMARY KEY ("session_id", "staff_id");



ALTER TABLE ONLY "sms_op"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "sms_op"."staff"
    ADD CONSTRAINT "staff_staff_number_key" UNIQUE ("staff_number");



ALTER TABLE ONLY "sms_op"."staff"
    ADD CONSTRAINT "staff_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_program_subjects_program_id" ON "core"."program_subjects" USING "btree" ("program_id");



CREATE INDEX "idx_program_subjects_subject_id" ON "core"."program_subjects" USING "btree" ("subject_id");



CREATE INDEX "idx_coe_enrolment_id" ON "cricos"."confirmations_of_enrolment" USING "btree" ("enrolment_id");



CREATE INDEX "idx_coe_status" ON "cricos"."confirmations_of_enrolment" USING "btree" ("status");



CREATE INDEX "idx_attendance_client_id" ON "sms_op"."session_attendance" USING "btree" ("client_id");



CREATE INDEX "idx_commission_agent_id_status" ON "sms_op"."agent_commissions" USING "btree" ("agent_id", "status");



CREATE INDEX "idx_enrolment_agent_id" ON "sms_op"."enrolments" USING "btree" ("agent_id");



CREATE INDEX "idx_enrolment_subjects_enrolment_id" ON "sms_op"."enrolment_subjects" USING "btree" ("enrolment_id");



CREATE INDEX "idx_instalment_plan_id" ON "sms_op"."payment_plan_instalments" USING "btree" ("payment_plan_id");



CREATE INDEX "idx_instalment_status_due_date" ON "sms_op"."payment_plan_instalments" USING "btree" ("status", "due_date");



CREATE INDEX "idx_invoices_status" ON "sms_op"."invoices" USING "btree" ("status");



CREATE INDEX "idx_line_item_invoice_id" ON "sms_op"."invoice_line_items" USING "btree" ("invoice_id");



CREATE INDEX "idx_outcome_enrolment_id" ON "sms_op"."enrolment_subject_outcomes" USING "btree" ("enrolment_id");



CREATE INDEX "idx_payment_invoice_id" ON "sms_op"."payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_session_course_offering_id" ON "sms_op"."sessions" USING "btree" ("course_offering_id");



CREATE INDEX "idx_session_subject_id" ON "sms_op"."sessions" USING "btree" ("subject_id");



CREATE INDEX "idx_submission_assessment_task_id" ON "sms_op"."assessment_submissions" USING "btree" ("assessment_task_id");



CREATE INDEX "idx_submission_client_id" ON "sms_op"."assessment_submissions" USING "btree" ("client_id");



CREATE OR REPLACE TRIGGER "clients_audit_trigger" AFTER UPDATE ON "core"."clients" FOR EACH ROW EXECUTE FUNCTION "core"."log_client_changes"();



CREATE OR REPLACE TRIGGER "check_trainer_availability_trigger" BEFORE INSERT OR UPDATE ON "sms_op"."session_trainers" FOR EACH ROW EXECUTE FUNCTION "sms_op"."check_trainer_availability"();



COMMENT ON TRIGGER "check_trainer_availability_trigger" ON "sms_op"."session_trainers" IS 'Ensures a trainer cannot be assigned to two overlapping sessions.';



CREATE OR REPLACE TRIGGER "outcomes_audit_trigger" AFTER INSERT OR UPDATE ON "sms_op"."enrolment_subject_outcomes" FOR EACH ROW EXECUTE FUNCTION "sms_op"."log_outcome_changes"();



ALTER TABLE ONLY "avetmiss"."client_disabilities"
    ADD CONSTRAINT "client_disabilities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "core"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "avetmiss"."client_prior_achievements"
    ADD CONSTRAINT "client_prior_achievements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "core"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "avetmiss"."client_avetmiss_details"
    ADD CONSTRAINT "fk_client_avetmiss_core_client" FOREIGN KEY ("client_id") REFERENCES "core"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "avetmiss"."program_avetmiss_details"
    ADD CONSTRAINT "fk_program_avetmiss_core_program" FOREIGN KEY ("program_id") REFERENCES "core"."programs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "avetmiss"."subject_avetmiss_details"
    ADD CONSTRAINT "fk_subject_avetmiss_core_subject" FOREIGN KEY ("subject_id") REFERENCES "core"."subjects"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "avetmiss"."program_completions"
    ADD CONSTRAINT "program_completions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "core"."clients"("id");



ALTER TABLE ONLY "avetmiss"."program_completions"
    ADD CONSTRAINT "program_completions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "core"."programs"("id");



ALTER TABLE ONLY "avetmiss"."program_completions"
    ADD CONSTRAINT "program_completions_training_organisation_id_fkey" FOREIGN KEY ("training_organisation_id") REFERENCES "core"."organisations"("id");



ALTER TABLE ONLY "avetmiss"."training_activities"
    ADD CONSTRAINT "training_activities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "core"."clients"("id");



ALTER TABLE ONLY "avetmiss"."training_activities"
    ADD CONSTRAINT "training_activities_delivery_location_id_fkey" FOREIGN KEY ("delivery_location_id") REFERENCES "core"."locations"("id");



ALTER TABLE ONLY "avetmiss"."training_activities"
    ADD CONSTRAINT "training_activities_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "core"."programs"("id");



ALTER TABLE ONLY "avetmiss"."training_activities"
    ADD CONSTRAINT "training_activities_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "core"."subjects"("id");



ALTER TABLE ONLY "avetmiss"."training_activities"
    ADD CONSTRAINT "training_activities_training_organisation_id_fkey" FOREIGN KEY ("training_organisation_id") REFERENCES "core"."organisations"("id");



ALTER TABLE ONLY "avetmiss_submissions"."submissions"
    ADD CONSTRAINT "fk_amends_submission" FOREIGN KEY ("amends_submission_id") REFERENCES "avetmiss_submissions"."submissions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "avetmiss_submissions"."submissions"
    ADD CONSTRAINT "fk_submission_contact_staff" FOREIGN KEY ("contact_staff_id") REFERENCES "sms_op"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "avetmiss_submissions"."snapshot_nat00010"
    ADD CONSTRAINT "snapshot_nat00010_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "avetmiss_submissions"."submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "avetmiss_submissions"."snapshot_nat00020"
    ADD CONSTRAINT "snapshot_nat00020_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "avetmiss_submissions"."submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "avetmiss_submissions"."snapshot_nat00120"
    ADD CONSTRAINT "snapshot_nat00120_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "avetmiss_submissions"."submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "avetmiss_submissions"."submissions"
    ADD CONSTRAINT "submissions_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id");



ALTER TABLE ONLY "core"."agents"
    ADD CONSTRAINT "agents_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "core"."addresses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "core"."client_addresses"
    ADD CONSTRAINT "client_addresses_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "core"."addresses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core"."client_addresses"
    ADD CONSTRAINT "client_addresses_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "core"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core"."clients_audit"
    ADD CONSTRAINT "fk_audit_client" FOREIGN KEY ("client_id") REFERENCES "core"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core"."client_notes"
    ADD CONSTRAINT "fk_note_client" FOREIGN KEY ("client_id") REFERENCES "core"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core"."client_notes"
    ADD CONSTRAINT "fk_note_staff" FOREIGN KEY ("staff_id") REFERENCES "sms_op"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "core"."program_subjects"
    ADD CONSTRAINT "fk_program" FOREIGN KEY ("program_id") REFERENCES "core"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core"."program_subjects"
    ADD CONSTRAINT "fk_subject" FOREIGN KEY ("subject_id") REFERENCES "core"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core"."locations"
    ADD CONSTRAINT "locations_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "core"."addresses"("id");



ALTER TABLE ONLY "core"."locations"
    ADD CONSTRAINT "locations_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "cricos"."confirmations_of_enrolment"
    ADD CONSTRAINT "fk_coe_sms_op_enrolment" FOREIGN KEY ("enrolment_id") REFERENCES "sms_op"."enrolments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "cricos"."client_details"
    ADD CONSTRAINT "fk_cricos_client_core_client" FOREIGN KEY ("client_id") REFERENCES "core"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "security"."users"
    ADD CONSTRAINT "fk_user_core_client" FOREIGN KEY ("client_id") REFERENCES "core"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "security"."users"
    ADD CONSTRAINT "fk_user_sms_op_staff" FOREIGN KEY ("staff_id") REFERENCES "sms_op"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "security"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "security"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "security"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "security"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "security"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "sms_op"."applications"
    ADD CONSTRAINT "applications_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "sms_op"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "sms_op"."applications"
    ADD CONSTRAINT "applications_created_client_id_fkey" FOREIGN KEY ("created_client_id") REFERENCES "core"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "sms_op"."applications"
    ADD CONSTRAINT "applications_created_enrolment_id_fkey" FOREIGN KEY ("created_enrolment_id") REFERENCES "sms_op"."enrolments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "sms_op"."course_offerings"
    ADD CONSTRAINT "course_offerings_delivery_location_id_fkey" FOREIGN KEY ("delivery_location_id") REFERENCES "core"."locations"("id");



ALTER TABLE ONLY "sms_op"."course_offerings"
    ADD CONSTRAINT "course_offerings_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "sms_op"."staff"("id");



ALTER TABLE ONLY "sms_op"."enrolments"
    ADD CONSTRAINT "enrolments_course_offering_id_fkey" FOREIGN KEY ("course_offering_id") REFERENCES "sms_op"."course_offerings"("id");



ALTER TABLE ONLY "sms_op"."assessment_tasks"
    ADD CONSTRAINT "fk_assessment_subject" FOREIGN KEY ("subject_id") REFERENCES "core"."subjects"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "sms_op"."session_attendance"
    ADD CONSTRAINT "fk_attendance_client" FOREIGN KEY ("client_id") REFERENCES "core"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "sms_op"."session_attendance"
    ADD CONSTRAINT "fk_attendance_recorded_by" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "sms_op"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "sms_op"."session_attendance"
    ADD CONSTRAINT "fk_attendance_session" FOREIGN KEY ("session_id") REFERENCES "sms_op"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "sms_op"."agent_commissions"
    ADD CONSTRAINT "fk_commission_agent" FOREIGN KEY ("agent_id") REFERENCES "core"."agents"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "sms_op"."agent_commissions"
    ADD CONSTRAINT "fk_commission_payment" FOREIGN KEY ("payment_id") REFERENCES "sms_op"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "sms_op"."enrolment_subjects"
    ADD CONSTRAINT "fk_enrolment" FOREIGN KEY ("enrolment_id") REFERENCES "sms_op"."enrolments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "sms_op"."enrolments"
    ADD CONSTRAINT "fk_enrolment_agent" FOREIGN KEY ("agent_id") REFERENCES "core"."agents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "sms_op"."enrolments"
    ADD CONSTRAINT "fk_enrolment_core_client" FOREIGN KEY ("client_id") REFERENCES "core"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "sms_op"."payment_plan_instalments"
    ADD CONSTRAINT "fk_instalment_invoice" FOREIGN KEY ("generated_invoice_id") REFERENCES "sms_op"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "sms_op"."payment_plan_instalments"
    ADD CONSTRAINT "fk_instalment_plan" FOREIGN KEY ("payment_plan_id") REFERENCES "sms_op"."payment_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "sms_op"."invoice_line_items"
    ADD CONSTRAINT "fk_line_item_invoice" FOREIGN KEY ("invoice_id") REFERENCES "sms_op"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "sms_op"."course_offerings"
    ADD CONSTRAINT "fk_offering_core_program" FOREIGN KEY ("program_id") REFERENCES "core"."programs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "sms_op"."enrolment_subject_outcomes"
    ADD CONSTRAINT "fk_outcome_enrolment" FOREIGN KEY ("enrolment_id") REFERENCES "sms_op"."enrolments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "sms_op"."enrolment_subject_outcomes"
    ADD CONSTRAINT "fk_outcome_recorded_by" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "sms_op"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "sms_op"."enrolment_subject_outcomes"
    ADD CONSTRAINT "fk_outcome_subject" FOREIGN KEY ("subject_id") REFERENCES "core"."subjects"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "sms_op"."payments"
    ADD CONSTRAINT "fk_payment_invoice" FOREIGN KEY ("invoice_id") REFERENCES "sms_op"."invoices"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "sms_op"."payments"
    ADD CONSTRAINT "fk_payment_recorded_by" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "sms_op"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "sms_op"."payment_plans"
    ADD CONSTRAINT "fk_plan_enrolment" FOREIGN KEY ("enrolment_id") REFERENCES "sms_op"."enrolments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "sms_op"."refunds"
    ADD CONSTRAINT "fk_refund_invoice" FOREIGN KEY ("invoice_id") REFERENCES "sms_op"."invoices"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "sms_op"."refunds"
    ADD CONSTRAINT "fk_refund_payment" FOREIGN KEY ("payment_id") REFERENCES "sms_op"."payments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "sms_op"."refunds"
    ADD CONSTRAINT "fk_refund_processed_by" FOREIGN KEY ("processed_by_staff_id") REFERENCES "sms_op"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "sms_op"."session_trainers"
    ADD CONSTRAINT "fk_session" FOREIGN KEY ("session_id") REFERENCES "sms_op"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "sms_op"."sessions"
    ADD CONSTRAINT "fk_session_course_offering" FOREIGN KEY ("course_offering_id") REFERENCES "sms_op"."course_offerings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "sms_op"."sessions"
    ADD CONSTRAINT "fk_session_location" FOREIGN KEY ("location_id") REFERENCES "core"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "sms_op"."sessions"
    ADD CONSTRAINT "fk_session_subject" FOREIGN KEY ("subject_id") REFERENCES "core"."subjects"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "sms_op"."session_trainers"
    ADD CONSTRAINT "fk_staff" FOREIGN KEY ("staff_id") REFERENCES "sms_op"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "sms_op"."enrolment_subjects"
    ADD CONSTRAINT "fk_subject" FOREIGN KEY ("subject_id") REFERENCES "core"."subjects"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "sms_op"."assessment_submissions"
    ADD CONSTRAINT "fk_submission_assessment_task" FOREIGN KEY ("assessment_task_id") REFERENCES "sms_op"."assessment_tasks"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "sms_op"."assessment_submissions"
    ADD CONSTRAINT "fk_submission_client" FOREIGN KEY ("client_id") REFERENCES "core"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "sms_op"."assessment_submissions"
    ADD CONSTRAINT "fk_submission_graded_by" FOREIGN KEY ("graded_by_staff_id") REFERENCES "sms_op"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "sms_op"."invoices"
    ADD CONSTRAINT "invoices_enrolment_id_fkey" FOREIGN KEY ("enrolment_id") REFERENCES "sms_op"."enrolments"("id");



ALTER TABLE ONLY "sms_op"."staff"
    ADD CONSTRAINT "staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "avetmiss" TO "anon";
GRANT USAGE ON SCHEMA "avetmiss" TO "authenticated";



GRANT USAGE ON SCHEMA "avetmiss_submissions" TO "anon";
GRANT USAGE ON SCHEMA "avetmiss_submissions" TO "authenticated";



GRANT USAGE ON SCHEMA "core" TO "anon";
GRANT USAGE ON SCHEMA "core" TO "authenticated";



GRANT USAGE ON SCHEMA "security" TO "authenticated";
GRANT USAGE ON SCHEMA "security" TO "anon";



GRANT USAGE ON SCHEMA "sms_op" TO "anon";
GRANT USAGE ON SCHEMA "sms_op" TO "authenticated";




























































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON TABLE "security"."roles" TO "service_role";



GRANT ALL ON TABLE "security"."user_roles" TO "service_role";



GRANT ALL ON TABLE "security"."users" TO "service_role";

































RESET ALL;
