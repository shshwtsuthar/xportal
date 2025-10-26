'use client';

import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Tables } from '@/database.types';

export type RowType = Tables<'applications'> & {
  agents?: Pick<Tables<'agents'>, 'name'> | null;
  programs?: Pick<Tables<'programs'>, 'name'> | null;
};

export type ColumnDef = {
  id: string;
  label: string;
  width?: number;
  sortable?: boolean;
  sortAccessor?: (row: RowType) => string | number;
  render: (row: RowType) => React.ReactNode;
  group?: string;
};

const YES_NO = (v: unknown) => (v ? 'Set' : 'Not set');
const FMT_DATE = (v: string | null | undefined) =>
  v ? format(new Date(v), 'dd MMM yyyy') : '';
const FULL_NAME = (r: RowType) =>
  [r.first_name, r.last_name].filter(Boolean).join(' ') || '—';

export const getApplicationsColumns = (): ColumnDef[] => {
  return [
    // Defaults
    {
      id: 'student_name',
      label: 'Student Name',
      width: 220,
      sortable: true,
      sortAccessor: (r) =>
        [r.first_name, r.last_name].filter(Boolean).join(' '),
      render: (r) => FULL_NAME(r),
      group: 'Identity',
    },
    {
      id: 'agent',
      label: 'Agent',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.agents?.name || '',
      render: (r) => r.agents?.name || '—',
      group: 'Agent',
    },
    {
      id: 'program',
      label: 'Program',
      width: 200,
      sortable: true,
      sortAccessor: (r) => (r.program_id ? 1 : 0),
      render: (r) => r.programs?.name || '—',
      group: 'Program & scheduling',
    },
    {
      id: 'status',
      label: 'Status',
      width: 140,
      sortable: true,
      sortAccessor: (r) => r.status as unknown as string,
      render: (r) => (
        <Badge
          variant={
            r.status === 'REJECTED'
              ? 'destructive'
              : r.status === 'SUBMITTED'
                ? 'default'
                : 'secondary'
          }
        >
          {r.status === 'OFFER_GENERATED'
            ? 'Offer Generated'
            : r.status === 'OFFER_SENT'
              ? 'Offer Sent'
              : r.status === 'ACCEPTED'
                ? 'Accepted'
                : r.status === 'DRAFT'
                  ? 'Draft'
                  : r.status === 'SUBMITTED'
                    ? 'Submitted'
                    : r.status === 'REJECTED'
                      ? 'Rejected'
                      : (r.status as unknown as string)}
        </Badge>
      ),
      group: 'Identity',
    },
    {
      id: 'requested_start',
      label: 'Requested Start',
      width: 160,
      sortable: true,
      sortAccessor: (r) =>
        r.requested_start_date
          ? new Date(r.requested_start_date as string).getTime()
          : 0,
      render: (r) => FMT_DATE(r.requested_start_date as string | null),
      group: 'Program & scheduling',
    },
    {
      id: 'updated_at',
      label: 'Updated At',
      width: 160,
      sortable: true,
      sortAccessor: (r) =>
        r.updated_at
          ? new Date(r.updated_at as unknown as string).getTime()
          : 0,
      render: (r) => FMT_DATE(r.updated_at as unknown as string),
      group: 'Identity',
    },

    // Identity
    {
      id: 'id',
      label: 'ID',
      width: 260,
      sortable: true,
      sortAccessor: (r) => r.id,
      render: (r) => r.id,
      group: 'Identity',
    },
    {
      id: 'assigned_to',
      label: 'Assigned To',
      width: 220,
      sortable: false,
      render: () => '—',
      group: 'Identity',
    },
    {
      id: 'created_at',
      label: 'Created At',
      width: 160,
      sortable: true,
      sortAccessor: (r) =>
        r.created_at
          ? new Date(r.created_at as unknown as string).getTime()
          : 0,
      render: (r) => FMT_DATE(r.created_at as unknown as string),
      group: 'Identity',
    },
    {
      id: 'first_name',
      label: 'First Name',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.first_name || '',
      render: (r) => r.first_name || '—',
      group: 'Identity',
    },
    {
      id: 'middle_name',
      label: 'Middle Name',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.middle_name || '',
      render: (r) => r.middle_name || '—',
      group: 'Identity',
    },
    {
      id: 'last_name',
      label: 'Last Name',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.last_name || '',
      render: (r) => r.last_name || '—',
      group: 'Identity',
    },
    {
      id: 'preferred_name',
      label: 'Preferred Name',
      width: 180,
      sortable: true,
      sortAccessor: (r) => r.preferred_name || '',
      render: (r) => r.preferred_name || '—',
      group: 'Identity',
    },
    {
      id: 'salutation',
      label: 'Salutation',
      width: 120,
      sortable: true,
      sortAccessor: (r) => r.salutation || '',
      render: (r) => r.salutation || '—',
      group: 'Identity',
    },
    {
      id: 'date_of_birth',
      label: 'Date of Birth',
      width: 160,
      sortable: true,
      sortAccessor: (r) =>
        r.date_of_birth ? new Date(r.date_of_birth as string).getTime() : 0,
      render: (r) => FMT_DATE(r.date_of_birth as string | null),
      group: 'Identity',
    },
    {
      id: 'gender',
      label: 'Gender',
      width: 120,
      sortable: true,
      sortAccessor: (r) => r.gender || '',
      render: (r) => r.gender || '—',
      group: 'Identity',
    },

    // Contact
    {
      id: 'email',
      label: 'Email',
      width: 220,
      sortable: true,
      sortAccessor: (r) => r.email || '',
      render: (r) => r.email || '—',
      group: 'Contact',
    },
    {
      id: 'alternative_email',
      label: 'Alt. Email',
      width: 220,
      sortable: true,
      sortAccessor: (r) => r.alternative_email || '',
      render: (r) => r.alternative_email || '—',
      group: 'Contact',
    },
    {
      id: 'phone_number',
      label: 'Phone',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.phone_number || '',
      render: (r) => r.phone_number || '—',
      group: 'Contact',
    },
    {
      id: 'work_phone',
      label: 'Work Phone',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.work_phone || '',
      render: (r) => r.work_phone || '—',
      group: 'Contact',
    },
    {
      id: 'mobile_phone',
      label: 'Mobile',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.mobile_phone || '',
      render: (r) => r.mobile_phone || '—',
      group: 'Contact',
    },
    {
      id: 'address_line_1',
      label: 'Address Line 1',
      width: 240,
      sortable: true,
      sortAccessor: (r) => r.address_line_1 || '',
      render: (r) => r.address_line_1 || '—',
      group: 'Contact',
    },
    {
      id: 'suburb',
      label: 'Suburb',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.suburb || '',
      render: (r) => r.suburb || '—',
      group: 'Contact',
    },
    {
      id: 'state',
      label: 'State',
      width: 120,
      sortable: true,
      sortAccessor: (r) => r.state || '',
      render: (r) => r.state || '—',
      group: 'Contact',
    },
    {
      id: 'postcode',
      label: 'Postcode',
      width: 120,
      sortable: true,
      sortAccessor: (r) => r.postcode || '',
      render: (r) => r.postcode || '—',
      group: 'Contact',
    },
    {
      id: 'street_building_name',
      label: 'Street Building',
      width: 200,
      sortable: true,
      sortAccessor: (r) => r.street_building_name || '',
      render: (r) => r.street_building_name || '—',
      group: 'Contact',
    },
    {
      id: 'street_unit_details',
      label: 'Street Unit',
      width: 180,
      sortable: true,
      sortAccessor: (r) => r.street_unit_details || '',
      render: (r) => r.street_unit_details || '—',
      group: 'Contact',
    },
    {
      id: 'street_number_name',
      label: 'Street Number/Name',
      width: 220,
      sortable: true,
      sortAccessor: (r) => r.street_number_name || '',
      render: (r) => r.street_number_name || '—',
      group: 'Contact',
    },
    {
      id: 'street_po_box',
      label: 'Street PO Box',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.street_po_box || '',
      render: (r) => r.street_po_box || '—',
      group: 'Contact',
    },
    {
      id: 'street_country',
      label: 'Street Country',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.street_country || '',
      render: (r) => r.street_country || '—',
      group: 'Contact',
    },
    {
      id: 'postal_is_same_as_street',
      label: 'Postal = Street',
      width: 140,
      sortable: true,
      sortAccessor: (r) => (r.postal_is_same_as_street ? 1 : 0),
      render: (r) => (r.postal_is_same_as_street ? 'Yes' : 'No'),
      group: 'Contact',
    },
    {
      id: 'postal_building_name',
      label: 'Postal Building',
      width: 200,
      sortable: true,
      sortAccessor: (r) => r.postal_building_name || '',
      render: (r) => r.postal_building_name || '—',
      group: 'Contact',
    },
    {
      id: 'postal_unit_details',
      label: 'Postal Unit',
      width: 180,
      sortable: true,
      sortAccessor: (r) => r.postal_unit_details || '',
      render: (r) => r.postal_unit_details || '—',
      group: 'Contact',
    },
    {
      id: 'postal_number_name',
      label: 'Postal Number/Name',
      width: 220,
      sortable: true,
      sortAccessor: (r) => r.postal_number_name || '',
      render: (r) => r.postal_number_name || '—',
      group: 'Contact',
    },
    {
      id: 'postal_po_box',
      label: 'Postal PO Box',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.postal_po_box || '',
      render: (r) => r.postal_po_box || '—',
      group: 'Contact',
    },
    {
      id: 'postal_suburb',
      label: 'Postal Suburb',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.postal_suburb || '',
      render: (r) => r.postal_suburb || '—',
      group: 'Contact',
    },
    {
      id: 'postal_state',
      label: 'Postal State',
      width: 120,
      sortable: true,
      sortAccessor: (r) => r.postal_state || '',
      render: (r) => r.postal_state || '—',
      group: 'Contact',
    },
    {
      id: 'postal_postcode',
      label: 'Postal Postcode',
      width: 140,
      sortable: true,
      sortAccessor: (r) => r.postal_postcode || '',
      render: (r) => r.postal_postcode || '—',
      group: 'Contact',
    },
    {
      id: 'postal_country',
      label: 'Postal Country',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.postal_country || '',
      render: (r) => r.postal_country || '—',
      group: 'Contact',
    },

    // Program & scheduling
    {
      id: 'program_id',
      label: 'Program (ID)',
      width: 200,
      sortable: true,
      sortAccessor: (r) => r.program_id || '',
      render: (r) => r.program_id || '—',
      group: 'Program & scheduling',
    },
    {
      id: 'proposed_commencement_date',
      label: 'Proposed Commencement',
      width: 180,
      sortable: true,
      sortAccessor: (r) =>
        r.proposed_commencement_date
          ? new Date(r.proposed_commencement_date as string).getTime()
          : 0,
      render: (r) => FMT_DATE(r.proposed_commencement_date as string | null),
      group: 'Program & scheduling',
    },
    {
      id: 'timetable_id',
      label: 'Timetable Linked',
      width: 160,
      sortable: true,
      sortAccessor: (r) => (r.timetable_id ? 1 : 0),
      render: (r) => YES_NO(r.timetable_id),
      group: 'Program & scheduling',
    },

    // Agent
    {
      id: 'agent_id',
      label: 'Agent (ID)',
      width: 200,
      sortable: true,
      sortAccessor: (r) => r.agent_id || '',
      render: (r) => r.agent_id || '—',
      group: 'Agent',
    },

    // AVETMISS & related
    {
      id: 'country_of_birth_id',
      label: 'Country of Birth',
      width: 180,
      sortable: true,
      sortAccessor: (r) => r.country_of_birth_id || '',
      render: (r) => r.country_of_birth_id || '—',
      group: 'AVETMISS',
    },
    {
      id: 'citizenship_status_code',
      label: 'Citizenship Code',
      width: 180,
      sortable: true,
      sortAccessor: (r) => r.citizenship_status_code || '',
      render: (r) => r.citizenship_status_code || '—',
      group: 'AVETMISS',
    },
    {
      id: 'indigenous_status_id',
      label: 'Indigenous Status',
      width: 180,
      sortable: true,
      sortAccessor: (r) => r.indigenous_status_id || '',
      render: (r) => r.indigenous_status_id || '—',
      group: 'AVETMISS',
    },
    {
      id: 'language_code',
      label: 'Language Code',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.language_code || '',
      render: (r) => r.language_code || '—',
      group: 'AVETMISS',
    },
    {
      id: 'english_proficiency_code',
      label: 'English Proficiency',
      width: 200,
      sortable: true,
      sortAccessor: (r) => r.english_proficiency_code || '',
      render: (r) => r.english_proficiency_code || '—',
      group: 'AVETMISS',
    },
    {
      id: 'highest_school_level_id',
      label: 'Highest School Level',
      width: 220,
      sortable: true,
      sortAccessor: (r) => r.highest_school_level_id || '',
      render: (r) => r.highest_school_level_id || '—',
      group: 'AVETMISS',
    },
    {
      id: 'labour_force_status_id',
      label: 'Labour Force Status',
      width: 200,
      sortable: true,
      sortAccessor: (r) => r.labour_force_status_id || '',
      render: (r) => r.labour_force_status_id || '—',
      group: 'AVETMISS',
    },
    {
      id: 'at_school_flag',
      label: 'At School',
      width: 120,
      sortable: true,
      sortAccessor: (r) => (r.at_school_flag || '').toString(),
      render: (r) => r.at_school_flag || '—',
      group: 'AVETMISS',
    },
    {
      id: 'is_international',
      label: 'International',
      width: 140,
      sortable: true,
      sortAccessor: (r) => (r.is_international ? 1 : 0),
      render: (r) => (r.is_international ? 'Yes' : 'No'),
      group: 'AVETMISS',
    },
    {
      id: 'usi',
      label: 'USI',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.usi || '',
      render: (r) => r.usi || '—',
      group: 'AVETMISS',
    },

    // International/CRICOS
    {
      id: 'passport_number',
      label: 'Passport Number',
      width: 200,
      sortable: true,
      sortAccessor: (r) => r.passport_number || '',
      render: (r) => r.passport_number || '—',
      group: 'CRICOS',
    },
    {
      id: 'visa_type',
      label: 'Visa Type',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.visa_type || '',
      render: (r) => r.visa_type || '—',
      group: 'CRICOS',
    },
    {
      id: 'visa_number',
      label: 'Visa Number',
      width: 180,
      sortable: true,
      sortAccessor: (r) => r.visa_number || '',
      render: (r) => r.visa_number || '—',
      group: 'CRICOS',
    },
    {
      id: 'country_of_citizenship',
      label: 'Country of Citizenship',
      width: 200,
      sortable: true,
      sortAccessor: (r) => r.country_of_citizenship || '',
      render: (r) => r.country_of_citizenship || '—',
      group: 'CRICOS',
    },
    {
      id: 'ielts_score',
      label: 'IELTS Score',
      width: 140,
      sortable: true,
      sortAccessor: (r) => r.ielts_score || '',
      render: (r) => r.ielts_score || '—',
      group: 'CRICOS',
    },

    // Payments
    {
      id: 'payment_plan_template_id',
      label: 'Payment Plan Linked',
      width: 180,
      sortable: true,
      sortAccessor: (r) => (r.payment_plan_template_id ? 1 : 0),
      render: (r) => YES_NO(r.payment_plan_template_id),
      group: 'Payments',
    },
    {
      id: 'payment_anchor_date',
      label: 'Payment Anchor Date',
      width: 180,
      sortable: true,
      sortAccessor: (r) =>
        r.payment_anchor_date
          ? new Date(r.payment_anchor_date as string).getTime()
          : 0,
      render: (r) => FMT_DATE(r.payment_anchor_date as string | null),
      group: 'Payments',
    },
    {
      id: 'offer_generated_at',
      label: 'Offer Generated At',
      width: 180,
      sortable: true,
      sortAccessor: (r) =>
        r.offer_generated_at
          ? new Date(r.offer_generated_at as string).getTime()
          : 0,
      render: (r) => FMT_DATE(r.offer_generated_at as string | null),
      group: 'Payments',
    },
  ];
};

export const DEFAULT_VISIBLE_COLUMNS = [
  'student_name',
  'agent',
  'program',
  'status',
  'requested_start',
  'updated_at',
];
