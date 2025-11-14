import {
  applicationSchema,
  type ApplicationFormValues,
} from './application.ts';

// Use master schema for submission validation - ensures consistency
export const submissionSchema = applicationSchema;

export type SubmissionValues = ApplicationFormValues;

function nullToUndefinedDeep<T>(value: T): T {
  if (value === null) return undefined as unknown as T;
  if (Array.isArray(value)) {
    return value.map((v) => nullToUndefinedDeep(v)) as unknown as T;
  }
  if (typeof value === 'object' && value !== undefined) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = nullToUndefinedDeep(v);
    }
    return result as unknown as T;
  }
  return value;
}

function normalizeIncomingValues(values: unknown): unknown {
  if (values === null || typeof values !== 'object') return values;
  const withUndef = nullToUndefinedDeep(
    values as Record<string, unknown>
  ) as Record<string, unknown>;
  // Align naming: map is_international_student -> is_international if missing
  if (
    withUndef.is_international === undefined &&
    typeof withUndef.is_international_student === 'boolean'
  ) {
    withUndef.is_international = withUndef.is_international_student;
  }
  // Normalize boolean-like flags to AVETMISS enums expected by schema
  withUndef.at_school_flag = normalizeBooleanFlagToAvetmiss(
    withUndef.at_school_flag
  );
  withUndef.disability_flag = normalizeBooleanFlagToAvetmiss(
    withUndef.disability_flag
  );
  withUndef.prior_education_flag = normalizeBooleanFlagToAvetmiss(
    withUndef.prior_education_flag
  );
  return withUndef;
}

function normalizeBooleanFlagToAvetmiss(
  value: unknown
): 'Y' | 'N' | '@' | undefined {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  if (typeof value === 'boolean') return value ? 'Y' : 'N';
  if (typeof value === 'string') {
    const v = value.trim().toUpperCase();
    if (v === 'Y' || v === 'N' || v === '@') return v;
    if (v === 'YES') return 'Y';
    if (v === 'NO') return 'N';
    if (v === '') return undefined;
  }
  return undefined;
}

function toDate(value: string | Date | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

function calculateAgeAt(
  dob: string | Date | undefined,
  atDate: string | Date | undefined
): number | null {
  const birth = toDate(dob);
  const at = toDate(atDate) ?? new Date();
  if (!birth) return null;
  let age = at.getFullYear() - birth.getFullYear();
  const m = at.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function computeDerivedFields(values: SubmissionValues) {
  // Survey contact status
  const ageAtCommencement = calculateAgeAt(
    values.date_of_birth,
    values.proposed_commencement_date
  );
  const survey_contact_status =
    values.is_international === true
      ? 'O'
      : ageAtCommencement !== null && ageAtCommencement < 15
        ? 'M'
        : 'A';

  // Under 18 computed if not explicitly set
  const is_under_18 =
    values.is_under_18 !== undefined
      ? values.is_under_18
      : ageAtCommencement !== null
        ? ageAtCommencement < 18
        : undefined;

  return {
    survey_contact_status,
    is_under_18,
  };
}

export function getSubmissionMissingFields(values: SubmissionValues): string[] {
  const missing: string[] = [];

  const requiredBasics: Array<keyof SubmissionValues> = [
    'first_name',
    'last_name',
    'date_of_birth',
    'program_id',
    'timetable_id',
    'proposed_commencement_date',
    'suburb',
    'state',
    'postcode',
    'gender',
    'highest_school_level_id',
    'indigenous_status_id',
    'labour_force_status_id',
    'country_of_birth_id',
    'language_code',
    'citizenship_status_code',
    'at_school_flag',
    'email',
  ];
  for (const key of requiredBasics) {
    const v = values[key];
    if (
      v === undefined ||
      v === null ||
      (typeof v === 'string' && v.trim() === '')
    ) {
      missing.push(String(key));
    }
  }

  // Mobile phone: required for international students (CRICOS)
  if (values.is_international === true) {
    if (!values.mobile_phone || values.mobile_phone.trim() === '') {
      missing.push('mobile_phone');
    }
  }

  // Year highest school level completed:
  // - If highest_school_level_id === '02' -> must be '@@@@'
  // - Else -> must be 2-digit year or '@@'
  if (values.highest_school_level_id) {
    if (values.highest_school_level_id === '02') {
      if (values.year_highest_school_level_completed !== '@@@@') {
        missing.push('year_highest_school_level_completed');
      }
    } else {
      const y = values.year_highest_school_level_completed ?? '';
      const ok = y === '@@' || /^[0-9]{2}$/.test(y);
      if (!ok) {
        missing.push('year_highest_school_level_completed');
      }
    }
  }

  // Domestic-only USI
  if (values.is_international === false) {
    const hasExemption =
      !!values.usi_exemption_code &&
      (values.usi_exemption_code === 'INDIV' ||
        values.usi_exemption_code === 'INTOFF');
    if (!hasExemption && (!values.usi || values.usi.trim().length === 0)) {
      missing.push('usi');
    }
  }

  // VSN (VIC, age < 25, domestic)
  if (values.state === 'VIC' && values.is_international === false) {
    const age = calculateAgeAt(
      values.date_of_birth,
      values.proposed_commencement_date
    );
    if (age !== null && age < 25) {
      const vsn = values.vsn ?? '';
      const ok = vsn === '000000000' || /^[0-9]{9}$/.test(vsn);
      if (!ok) {
        missing.push('vsn');
      }
    }
  }

  // Flags must be set on submission (Y, N, or @)
  if (values.disability_flag === undefined) missing.push('disability_flag');
  if (values.prior_education_flag === undefined)
    missing.push('prior_education_flag');

  // CRICOS: if international
  if (values.is_international === true) {
    // Country of citizenship
    if (
      !values.country_of_citizenship ||
      values.country_of_citizenship.trim() === ''
    ) {
      missing.push('country_of_citizenship');
    }

    // Street country must be present for international
    if (!values.street_country || values.street_country.trim() === '') {
      missing.push('street_country');
    }

    // Passport number if student "in Australia"
    const inAustralia =
      values.street_country === 'AU' ||
      (values.state && values.state.trim() !== '');
    if (inAustralia) {
      if (
        !values.passport_number ||
        values.passport_number.trim().length === 0
      ) {
        missing.push('passport_number');
      }
    }

    // Visa number if holds_visa
    if (values.holds_visa === true) {
      if (!values.visa_number || values.visa_number.trim().length === 0) {
        missing.push('visa_number');
      }
    }

    // Under 18 welfare
    const { is_under_18 } = computeDerivedFields(values);
    if (is_under_18 === true) {
      if (values.provider_accepting_welfare_responsibility === undefined) {
        missing.push('provider_accepting_welfare_responsibility');
      }
      if (
        values.provider_accepting_welfare_responsibility === true &&
        !values.welfare_start_date
      ) {
        missing.push('welfare_start_date');
      }
      if (values.provider_accepting_welfare_responsibility === false) {
        if (!values.g_name || values.g_name.trim() === '')
          missing.push('g_name');
        if (!values.g_relationship || values.g_relationship.trim() === '')
          missing.push('g_relationship');
        if (!values.g_phone_number || values.g_phone_number.trim() === '')
          missing.push('g_phone_number');
        if (!values.g_email || values.g_email.trim() === '')
          missing.push('g_email');
      }
    }

    // OSHC if provider arranged
    if (values.provider_arranged_oshc === true) {
      if (!values.oshc_provider_name) missing.push('oshc_provider_name');
      if (!values.oshc_start_date) missing.push('oshc_start_date');
      if (!values.oshc_end_date) missing.push('oshc_end_date');
    }

    // English test fields if taken
    if (values.has_english_test === true) {
      if (!values.english_test_type) missing.push('english_test_type');
      if (!values.ielts_score) missing.push('ielts_score');
    }

    // Previous study block
    if (values.has_previous_study_australia === true) {
      if (!values.previous_provider_name)
        missing.push('previous_provider_name');
      if (values.completed_previous_course === undefined)
        missing.push('completed_previous_course');
      if (values.has_release_letter === undefined)
        missing.push('has_release_letter');
    }
  }

  return missing;
}

export function validateSubmission(values: unknown) {
  const normalized = normalizeIncomingValues(values);
  const parsed = submissionSchema.safeParse(normalized);
  if (!parsed.success) {
    return {
      ok: false as const,
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    };
  }
  // Derived field sanity (server will set/override)
  const missing = getSubmissionMissingFields(parsed.data);
  if (missing.length > 0) {
    return {
      ok: false as const,
      issues: missing.map((m) => ({
        path: m,
        message: 'Required for submission',
      })),
    };
  }
  return { ok: true as const, data: parsed.data };
}
