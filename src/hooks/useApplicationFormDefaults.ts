import {
  OVERSEAS_POSTCODE,
  OVERSEAS_STATE_CODE,
  type ApplicationFormValues,
} from '@/src/lib/applicationSchema';
import type { Tables } from '@/database.types';

/**
 * Maps a database application record to form default values.
 * Handles null coalescing and type conversions consistently.
 */
export function mapApplicationToFormValues(
  application: Tables<'applications'>
): Partial<ApplicationFormValues> {
  return {
    salutation: application.salutation ?? '',
    first_name: application.first_name ?? '',
    middle_name: application.middle_name ?? '',
    last_name: application.last_name ?? '',
    preferred_name: application.preferred_name ?? '',
    date_of_birth: application.date_of_birth ?? '',
    program_id: application.program_id ?? '',
    timetable_id: application.timetable_id ?? '',
    preferred_location_id: application.preferred_location_id ?? '',
    group_id: application.group_id ?? '',
    proposed_commencement_date: application.proposed_commencement_date ?? '',
    payment_plan_template_id: application.payment_plan_template_id ?? '',
    payment_anchor_date: application.payment_anchor_date ?? '',
    agent_id: application.agent_id ? application.agent_id : 'none',
    email: application.email ?? '',
    work_phone: application.work_phone ?? '',
    mobile_phone: application.mobile_phone ?? '',
    home_phone: application.home_phone ?? '',
    alternative_email: application.alternative_email ?? '',
    address_line_1: application.address_line_1 ?? '',
    suburb: application.suburb ?? '',
    state: application.is_international
      ? OVERSEAS_STATE_CODE
      : (application.state ?? ''),
    postcode: application.is_international
      ? OVERSEAS_POSTCODE
      : (application.postcode ?? ''),
    street_building_name: application.street_building_name ?? '',
    street_unit_details: application.street_unit_details ?? '',
    street_number: application.street_number ?? '',
    street_name: application.street_name ?? '',
    street_po_box: application.street_po_box ?? '',
    street_country: application.street_country ?? 'AU',
    postal_is_same_as_street: Boolean(application.postal_is_same_as_street),
    postal_building_name: application.postal_building_name ?? '',
    postal_unit_details: application.postal_unit_details ?? '',
    postal_street_number: application.postal_street_number ?? '',
    postal_street_name: application.postal_street_name ?? '',
    postal_po_box: application.postal_po_box ?? '',
    postal_suburb: application.postal_suburb ?? '',
    postal_state: application.postal_state ?? '',
    postal_postcode: application.postal_postcode ?? '',
    postal_country: application.postal_country ?? 'AU',
    gender: application.gender ?? '',
    highest_school_level_id: application.highest_school_level_id ?? '',
    indigenous_status_id: application.indigenous_status_id ?? '',
    labour_force_status_id: application.labour_force_status_id ?? '',
    study_reason_id:
      application.study_reason_id &&
      [
        '01',
        '02',
        '03',
        '04',
        '05',
        '06',
        '07',
        '08',
        '11',
        '12',
        '13',
      ].includes(application.study_reason_id)
        ? application.study_reason_id
        : '',
    country_of_birth_id: application.country_of_birth_id ?? 'AU',
    language_code: application.language_code ?? '',
    citizenship_status_code: application.citizenship_status_code ?? '',
    at_school_flag: application.at_school_flag ?? '',
    disability_flag:
      application.disability_flag === null ||
      application.disability_flag === undefined
        ? ('@' as const)
        : (application.disability_flag as 'Y' | 'N' | '@'),
    prior_education_flag:
      application.prior_education_flag === null ||
      application.prior_education_flag === undefined
        ? ('@' as const)
        : (application.prior_education_flag as 'Y' | 'N' | '@'),
    disabilities: [], // Will be loaded by Step3_AdditionalInfo component
    prior_education: [], // Will be loaded by Step3_AdditionalInfo component
    year_highest_school_level_completed:
      application.year_highest_school_level_completed ?? '',
    survey_contact_status: (application.survey_contact_status &&
    ['A', 'C', 'D', 'E', 'I', 'M', 'O'].includes(
      application.survey_contact_status
    )
      ? application.survey_contact_status
      : 'A') as 'A' | 'C' | 'D' | 'E' | 'I' | 'M' | 'O',
    vsn: application.vsn ?? '',
    is_international: Boolean(application.is_international),
    usi: application.usi ?? '',
    usi_exemption_code: (() => {
      const value = (application as Record<string, unknown>).usi_exemption_code;
      return value === 'INDIV' || value === 'INTOFF' ? value : undefined;
    })(),
    passport_number: application.passport_number ?? '',
    passport_issue_date: application.passport_issue_date ?? '',
    passport_expiry_date: application.passport_expiry_date ?? '',
    place_of_birth: application.place_of_birth ?? '',
    visa_type: application.visa_type ?? '',
    visa_number: application.visa_number ?? '',
    visa_application_office: application.visa_application_office ?? '',
    holds_visa: application.holds_visa ?? false,
    country_of_citizenship: application.country_of_citizenship ?? 'AU',
    ielts_score: application.ielts_score ?? '',
    has_english_test: Boolean(application.has_english_test),
    english_test_type: application.english_test_type ?? '',
    english_test_date: application.english_test_date ?? '',
    has_previous_study_australia: Boolean(
      application.has_previous_study_australia
    ),
    previous_provider_name: application.previous_provider_name ?? '',
    completed_previous_course:
      application.completed_previous_course ?? undefined,
    has_release_letter: application.has_release_letter ?? undefined,
    provider_accepting_welfare_responsibility:
      application.provider_accepting_welfare_responsibility ?? undefined,
    welfare_start_date: application.welfare_start_date ?? '',
    is_under_18: Boolean(application.is_under_18),
    provider_arranged_oshc: Boolean(application.provider_arranged_oshc),
    oshc_provider_name: application.oshc_provider_name ?? '',
    oshc_start_date: application.oshc_start_date ?? '',
    oshc_end_date: application.oshc_end_date ?? '',
    ec_name: application.ec_name ?? '',
    ec_relationship: application.ec_relationship ?? '',
    ec_phone_number: application.ec_phone_number ?? '',
    g_name: application.g_name ?? '',
    g_email: application.g_email ?? '',
    g_phone_number: application.g_phone_number ?? '',
    g_relationship: application.g_relationship ?? '',
  };
}
