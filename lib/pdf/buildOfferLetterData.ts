import { Database } from '@/database.types';
import type { OfferLetterData } from './OfferLetterTemplate';

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
    logoSrc: '',
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
    hotlineEmail: 'ntch@education.gov.au',
    asqaUrl: 'https://www.asqa.gov.au/complaints',
    consumerLawNote:
      'This agreement does not remove your rights under Australian Consumer Law.',
  },
  privacy: {
    deseUrl: 'https://www.dese.gov.au/national-vet-data/vet-privacy-notice',
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
}): OfferLetterData {
  const { application, schedule } = input;
  const institution = BRAND.institution;
  const program = application.programs ?? null;
  const totalCents = schedule.reduce(
    (sum, r) => sum + (r.amount_cents ?? 0),
    0
  );

  return {
    institution: {
      ...institution,
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
        'We want to make sure you understand all fees and charges associated with your course so please carefully read this section before signing the Student Agreement. Any fees and charges documented in the agreement will not change during the duration of your course.',
        'We protect your fees at all times by:',
        '1. Maintaining a sufficient amount in our account so that so we are able to repay all tuition fees already paid.',
        '2. Through our membership of the Tuition Protection Scheme (TPS).  The role of the TPS is to assist international students where we are unable to fully deliver their course of study. The TPS ensures that you are able to either complete their studies in another course or with another education provider or receive a refund of your unspent tuition fees.',
        '3. Not requiring you to pay more than 50% of course fees prior to commencement, except where a course is less than 26 weeks. However, you may choose to pay your fees in full or a greater amount than 50%. Please contact us if you would like to pay more than is documented in your student agreement.',
      ],
      additionalFeesNotice:
        ' Please note that the following fees can apply in addition to the fees advertised on the Website. The following additional fees may apply are given below.',
    },
    additionalFees: [
      { name: 'Deferment Fee', amount: '$200.00' },
      { name: 'Application fees', amount: '$250.00' },
      { name: 'Change of CoE', amount: '$50.00' },
      {
        name: 'Extend of Course Duration',
        amount: 'As per the current fee schedule',
      },
      {
        name: 'Supplementary Assessment',
        amount: '2 free re-assessment attempts',
      },
      {
        name: 'Supplementary Assessment',
        amount: '$100/after two free resubmission attempts',
      },
      { name: 'Re-Assessment fee for practical based unit', amount: '$250.00' },
      { name: 'Unit repeat Cost', amount: '$500' },
      { name: 'Replacement Student ID', amount: '$20.00' },
      {
        name: 'Work Based Training (WBT) fee',
        amount: 'Confirmation on request',
      },
      { name: 'Credit Transfer before COE is issued', amount: 'No Charge' },
      { name: 'Credit Transfer after COE is issued', amount: '$200.00' },
      {
        name: 'RPL fees',
        amount: '$250.00 Application fees and $250.00 per unit',
      },
      { name: 'Change of course fees', amount: '$250.00' },
      { name: 'Change of location', amount: '$200.00' },
      { name: 'Certificate re-issue fee', amount: '$80.00' },
      { name: 'Interim academic transcript', amount: '$50.00' },
      {
        name: 'Reissuance of Records (Certificate & Transcript)',
        amount: '$200.00',
      },
      { name: 'Student Photocopying', amount: '10c per page' },
      { name: 'Overseas Health Cover', amount: 'Confirmation on request' },
      { name: 'Airport pick-up', amount: 'Confirmation on request' },
      {
        name: 'Temporary Accommodation charges',
        amount: 'Confirmation on request',
      },
      { name: 'Loss of Library books', amount: 'Replacement cost' },
      { name: 'Refund Processing fee', amount: '$100.00' },
      { name: 'Reference Letter', amount: '$50.00' },
      {
        name: 'Failure to attend required number of class hours',
        amount:
          '$20 p/hr (Starts when student fails to attend more than 20%) of class contact hours)',
      },
      {
        name: 'Fees for late payment of fees',
        amount: '$100 per week for each week the payment for fees is delayed',
      },
      { name: 'Fees for late submission of assessment', amount: '$100' },
    ],
    refundsCircumstances: [
      {
        circumstance: 'The course does not start on the agreed start date',
        refundDue: 'Full refund of all fees paid',
      },
    ],
    complaintsAppeals: {
      paragraphs: [
        'We sincerely hope not, but from time to time you may be unhappy with the services we provide or want to appeal a decision we have made. We take your complaints and appeals seriously and will ensure in assessing them that we look at the causes and action that we can take to ensure it does not happen again/reduce the likelihood of it happening again.',
        'Complaints can be made against us as the RTO, our trainers and assessors and other staff, another learner of Ashford College as well as any third party that provides services on our behalf such as education agents.',
        'Complaints can be in relation to any aspect of our services.',
        'Appeals can be made in respect of any decision made by Ashford College. An appeal is a request for Ashford College’s decision to be reviewed in relation to a matter, including assessment appeals.',
        'In managing complaints, we will ensure that the principles of natural justice and procedural fairness are adopted at every stage of the complaint process. This means that we will review each complaint or appeal in an objective and consistent manner and give everyone the opportunity to present their point of view.',
        'Our internal complaints and appeals process can be accessed at no cost.',
        'We do encourage you to firstly seek to address the issue informally by discussing it with the person involved.',
        'However, if you do not feel comfortable with this or you have tried this and did not get the outcome you wished you can access the formal complaints and appeals process.',
        'If you want to make a complaint or appeal, you must: Submit your complaint or appeal in writing using the complaints and appeals form. The complaints and appeals form outlines the information that should be provided and can be accessed from reception or on our website.',
        'Submit your complaint within 30 calendar days of the incident or in the case of an appeal within 30 calendar days of the decision being made.',
        'We will acknowledge your complaint or appeal will be acknowledged in writing within 5 working days of receipt. We will review your complaint or appeal will commence within 5 working days of receiving the complaints. Complaints and appeals will be finalised as soon as practicable or within 30 calendar days. However, where the complaint or appeal is expected to take more than 60 calendar days to process, Ashford College will write to inform the complainant or appellant of this including the reasons for such. Following this update, regular updates will be provided of progress.',
        'For assessment appeals, we will appoint an independent assessor to conduct a review of an assessment decision that is being appealed.',
        'We will communicate the result of the complaints and appeals process to you in writing and this will include the reasons for the decision. If you do need to come in for a meeting, you can have a support person of your choice present to assist you to resolve the complaint or appeal. Generally, your enrolment will be maintained throughout any internal appeals process that concerns a decision to report you.',
        'Additionally, if the appeal is against our decision to report you for unsatisfactory course progress or attendance, your enrolment will be maintained until the external process is completed and has supported or not our decision to report you. If the appeal is against our decision to defer, suspend or cancel your enrolment due to misbehaviour, we will only take action after the outcome of the internal appeals process.',
        'Where the internal process has failed to resolve the complaint or appeal, you will be able to take your case to the Overseas Students Ombudsman (OSO).',
      ],
      bulletsInternationalStudents: [
        'being refused admission to a course',
        'course fees and refunds',
        'being refused a course transfer',
        'course progress or attendance',
        'cancellation of enrolment',
        'accommodation or work arranged by Australian Sovereign College',
        'incorrect advice given by an education agent',
        'taking too long in certain processes such as issuing results',
        'not delivering the services indicated in the Student Agreement',
        'More information can be found at:',
        'http://www.ombudsman.gov.au/',
        'You can access this service at no cost in relation to matters that cannot be resolved through internal processes. Further information and contact details are included below.',
        'We will cooperate in full with the OSO and will immediately implement their decisions or recommendations and/or take preventative or corrective action required by the decision or recommendation.',
        'Complaints can also be made to the organisations indicated below:',
        'We will communicate all actions to you in writing based on the OSO’s decision.',
      ],
      ombudsmanUrl: BRAND.complaints.ombudsmanUrl,
      hotlinePhone: BRAND.complaints.hotlinePhone,
      hotlineEmail: BRAND.complaints.hotlineEmail,
      asqaUrl: BRAND.complaints.asqaUrl,
      consumerLawNote: BRAND.complaints.consumerLawNote,
    },
    privacy: {
      whyCollect: [
        'As a registered training organisation (RTO), we collect your personal information so we can process and manage your enrolment in a vocational education and training (VET) course with us. If you do not provide this information, we will be unable to process your enrolment.',
      ],
      howUse: [
        'We use your personal information to enable us to deliver VET courses to you, and otherwise, as needed, to comply with our obligations as an RTO.',
      ],
      howDisclose: [
        'We are required by law (under the National Vocational Education and Training Regulator Act 2011 (Cth) (NVETR Act)) to disclose the personal information we collect about you to the National VET Data Collection kept by the National Centre for Vocational Education Research Ltd (NCVER). The NCVER is responsible for collecting, managing, analysing and communicating research and statistics about the Australian VET sector.',
        'We are also authorised by law (under the NVETR Act) to disclose your personal information to the relevant state or territory training authority.',
      ],
      ncverHandlingIntro: [
        'The NCVER will collect, hold, use and disclose your personal information in accordance with the law, including the Privacy Act 1988 (Cth) (Privacy Act) and the NVETR Act. Your personal information may be used and disclosed by NCVER for purposes including:',
      ],
      ncverPurposes: [
        'administration of VET, including program administration, regulation, monitoring and evaluation',
        'facilitation of statistics and research relating to education, including surveys and data linkage',
        'understanding how the VET market operates, for policy, workforce planning and consumer information',
      ],
      ncverMore: [
        'The NCVER is authorised to disclose information to the Australian Government Department of Education, Skills and Employment (DESE), Commonwealth authorities, State and Territory authorities (other than registered training organisations) that deal with matters relating to VET and VET regulators for the purposes of those bodies.',
        'The NCVER may also disclose personal information to persons engaged by NCVER to conduct research on NCVER’s behalf.',
        'The NCVER does not intend to disclose your personal information to any overseas recipients.',
        'For more information about how the NCVER will handle your personal information please refer to the NCVER’s Privacy Policy at www.ncver.edu.au/privacy.',
        'If you would like to seek access to or correct your information, in the first instance, please contact us using the contact details listed below.',
      ],
      deseNote:
        'DESE is authorised by law, including the Privacy Act and the NVETR Act, to collect, use and disclose your personal information to fulfil specified functions and activities. For more information about how the DESE will handle your personal information, please refer to the DESE VET Privacy Notice:',
      deseUrl: BRAND.privacy.deseUrl,
      surveys:
        'You may receive a student survey which may be run by a government department or an NCVER employee, agent, third-party contractor or another authorised agency. Please note you may opt out of the survey at the time of being contacted.',
      contactInfo: [
        'At any time, you may contact Ashford College to:',
        '• request access to your personal information',
        '• correct your personal information',
        '• make a complaint about how your personal information has been handled',
        '• ask a question about this Privacy Notice',
        'Please contact us at the details shown in our International Student Handbook and we can also send you a copy of our privacy policy.',
      ],
      changeOfContactRequirement:
        'You are required to notify us of any change to your contact details including your residential address, mobile number, email address and who to contact in emergency situations. You must advise us within 7 days of the changes occurring.',
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
      version: 'V2.1: November 2024, Approved: PEO, Next Review: November 2025',
    },
  };
}
