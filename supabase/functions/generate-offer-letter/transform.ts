import type { Database } from '../_shared/database.types.ts';
import type { OfferLetterData } from './template.tsx';

type AppRow = Database['public']['Tables']['applications']['Row'] & {
  programs?: Pick<
    Database['public']['Tables']['programs']['Row'],
    'id' | 'code' | 'name' | 'nominal_hours'
  > | null;
  agents?: Pick<
    Database['public']['Tables']['agents']['Row'],
    'id' | 'name'
  > | null;
  rtos?: Pick<
    Database['public']['Tables']['rtos']['Row'],
    | 'id'
    | 'name'
    | 'rto_code'
    | 'address_line_1'
    | 'suburb'
    | 'state'
    | 'postcode'
    | 'phone_number'
    | 'email_address'
    | 'profile_image_path'
  > | null;
};

type ScheduleRow =
  Database['public']['Tables']['application_payment_schedule']['Row'];

const BRAND = {
  institution: {
    name: 'Ashford College',
    addressLine: 'Level 3/65 Brougham Street, Geelong VIC - 3220',
    email: 'info@ashford.edu.au',
    phone: '+61 3 9999 9999',
    website: 'www.ashford.edu.au',
    rtoCode: '46296',
    cricosCode: '04304G',
    logoSrc: 'https://dummyimage.com/220x104/0B3D91/ffffff.png&text=LOGO',
  },
  document: {
    titleStrip: 'Offer Letter and International Student Agreement',
    versionLine:
      'V2.1: November 2024, Approved: PEO, Next Review: November 2025',
    docTitle: 'Letter of Offer',
  },
  complaints: {
    ombudsmanUrl: 'https://www.ombudsman.gov.au',
    hotlinePhone: '13 38 73',
    hotlineEmail: 'skilling@education.gov.au',
    asqaUrl: 'https://www.asqa.gov.au',
    consumerLawNote:
      'This agreement does not remove your rights under Australian Consumer Law.',
  },
  privacy: {
    deseUrl: 'https://www.ncver.edu.au',
  },
};

const formatDate = (d?: string | null) => {
  if (!d) return '';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = dt.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

const formatCurrency = (cents?: number | null) => {
  const n = (cents ?? 0) / 100;
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
};

export function buildOfferLetterData(input: {
  application: AppRow;
  schedule: ScheduleRow[];
  rtoLogoUrl?: string | null;
}): OfferLetterData {
  const { application, schedule, rtoLogoUrl } = input;
  const institution = BRAND.institution;
  const program = application.programs ?? null;

  const totalCents = schedule.reduce(
    (sum, r) => sum + (r.amount_cents ?? 0),
    0
  );

  return {
    institution: {
      ...institution,
      // Prefer DB values when present
      name: application.rtos?.name ?? institution.name,
      addressLine:
        [
          application.rtos?.address_line_1,
          application.rtos?.suburb,
          application.rtos?.state,
          application.rtos?.postcode,
        ]
          .filter(Boolean)
          .join(' ') || institution.addressLine,
      email: application.rtos?.email_address ?? institution.email,
      phone: application.rtos?.phone_number ?? institution.phone,
      rtoCode: application.rtos?.rto_code ?? institution.rtoCode,
      logoSrc: rtoLogoUrl ?? institution.logoSrc,
    },
    document: BRAND.document,
    offer: {
      offerLetterId: application.id,
      date: formatDate(new Date().toISOString()),
      addresseeLine1:
        `${application.salutation ?? ''} ${(application.first_name ?? '').toUpperCase()} ${(application.last_name ?? '').toUpperCase()}`.trim(),
      addresseeLine2:
        `${application.address_line_1 ?? ''} ${application.suburb ?? ''} ${application.state ?? ''} ${application.postcode ?? ''}`.trim(),
      agency: application.agents?.name ?? 'N/A',
      greetingName:
        `${(application.first_name ?? '').toUpperCase()} ${(application.last_name ?? '').toUpperCase()}`.trim(),
    },
    student: {
      studentId: application.id,
      firstName: (application.first_name ?? '').toUpperCase(),
      surname: (application.last_name ?? '').toUpperCase(),
      dateOfBirth: formatDate(application.date_of_birth),
      nationality: application.country_of_citizenship ?? '',
      gender: application.gender ?? '',
      passportNo: application.passport_number ?? '',
      phone: application.mobile_phone ?? application.work_phone ?? '',
      email: application.email ?? application.alternative_email ?? '',
    },
    course: {
      proposalNo: application.id,
      cricosCourseCode: '117132E',
      courseCode: program?.code ?? '',
      courseName: program?.name ?? '',
      startDate: formatDate(application.proposed_commencement_date),
      endDate: '',
      location: 'Geelong',
      hoursPerWeek: '20',
      totalWeeks: '52',
      agreedStartDate: formatDate(application.proposed_commencement_date),
      expectedEndDate: '',
      locationsList: [
        'Geelong: Level 3/65 Brougham Street, Geelong VIC - 3220',
      ],
    },
    conditionsOfOffer: [],
    hoursPerWeekClause: '20 hours a week in the classroom',
    entryRequirementText:
      'Must be at least 18 years old and have completed Year 12 or equivalent.',
    paymentPlan: {
      enrolId: application.id,
      rows: schedule.map((r) => ({
        date: formatDate(r.due_date as unknown as string),
        feeType: r.name,
        amount: formatCurrency(r.amount_cents),
      })),
      totalCourseFees: formatCurrency(totalCents),
    },
    bank: {
      accountName: 'Ashford College',
      bank: 'Commonwealth Bank',
      bsb: '063-000',
      accountNumber: '12345678',
      swiftCode: 'CTBAAU2S',
    },
    refundsBlocks: {
      intro: [
        'All fees and charges payable by you are outlined in the Payment of Fees section of this agreement.',
        'All fees are in Australian Dollars (AUD) and are inclusive of GST unless stated otherwise.',
      ],
      additionalFeesNotice: 'The following additional fees may apply:',
    },
    additionalFees: [
      {
        name: 'Re-issue of Certificate or Statement of Attainment',
        amount: '$50.00',
      },
      { name: 'Re-Assessment Fee', amount: '$100.00' },
    ],
    refundsCircumstances: [
      {
        circumstance: 'The course does not start on the agreed start date',
        refundDue: 'Full refund of all fees paid',
      },
    ],
    complaintsAppeals: {
      paragraphs: [
        'We have policies and procedures in place to handle complaints and appeals.',
      ],
      bulletsInternationalStudents: [
        'Course fees and refunds',
        'Disputes with education providers',
      ],
      ombudsmanUrl: BRAND.complaints.ombudsmanUrl,
      hotlinePhone: BRAND.complaints.hotlinePhone,
      hotlineEmail: BRAND.complaints.hotlineEmail,
      asqaUrl: BRAND.complaints.asqaUrl,
      consumerLawNote: BRAND.complaints.consumerLawNote,
    },
    privacy: {
      whyCollect: [
        'RTOs are required to collect personal information under the Data Provision Requirements 2012.',
      ],
      howUse: ['We use your personal information to deliver services to you.'],
      howDisclose: ['We may disclose your information to government agencies.'],
      ncverHandling: [
        'The NCVER will collect, hold, use and disclose your personal information.',
      ],
      deseNote: 'More information about NCVER can be found at:',
      deseUrl: BRAND.privacy.deseUrl,
      surveys:
        'You may receive surveys from NCVER to help improve education and training.',
      contactInfo: ['Contact us at privacy@ashford.edu.au'],
      changeOfContactRequirement:
        'You must notify us of any changes to your contact details within 7 days.',
    },
    studentDeclaration: {
      paragraphs: [
        'I declare that the information I have provided is true and correct.',
        'I have read and understood the terms and conditions.',
      ],
      websiteMention: `For more information visit ${institution.website}`,
      namePlaceholder:
        `${(application.first_name ?? '').toUpperCase()} ${(application.last_name ?? '').toUpperCase()}`.trim(),
    },
    metaFooter: {
      leftCode: `RTO Code: ${application.rtos?.rto_code ?? institution.rtoCode} | CRICOS Code: ${institution.cricosCode}`,
      version: BRAND.document.versionLine,
    },
  };
}
