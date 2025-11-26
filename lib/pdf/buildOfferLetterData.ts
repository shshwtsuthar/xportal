import { Database } from '@/database.types';
import type { OfferLetterData } from './OfferLetterTemplate';

// 1. Define input types based on your Supabase schema
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
    | 'cricos_code'
    | 'address_line_1'
    | 'suburb'
    | 'state'
    | 'postcode'
    | 'phone_number'
    | 'email_address'
    | 'profile_image_path'
    | 'bank_name'
    | 'bank_account_name'
    | 'bank_bsb'
    | 'bank_account_number'
  > | null;
  application_learning_subjects?: Array<{
    planned_end_date: string;
  }> | null;
};

type ScheduleRow =
  Database['public']['Tables']['application_payment_schedule']['Row'];

// 2. Helpers
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

// 3. Static Content (Compliance Text from "Correct" PDF)
const REFUND_POLICIES = [
  {
    circumstance: 'Ashford College cancels course before commencement',
    refundDue: 'Full refund of all fees',
  },
  {
    circumstance: 'Ashford College cancels course following commencement',
    refundDue:
      'Full refund of all unspent fees calculated as follows: Weekly tuition fee multiplied by the weeks in the default period (calculated from the date of default).',
  },
  {
    circumstance:
      'Ashford College has not provided a Student Agreement that meets the requirements of the National Code 2018.',
    refundDue:
      'Full refund of all unspent fees calculated as follows: Weekly tuition fee multiplied by the weeks in the default period (calculated from the date of default).',
  },
  {
    circumstance:
      'Student withdraws up to 4 weeks prior to course commencement.',
    refundDue:
      'Application fee not refunded. Refund of 70% of all other fees and charges.',
  },
  {
    circumstance:
      'Student withdraws less than 4 weeks prior to course commencement.',
    refundDue:
      'Application fee not refunded. Refund of 50% of all other fees and charges.',
  },
  {
    circumstance:
      'Student withdraws less than 2 weeks prior to course commencement.',
    refundDue: 'No refund. Fees for full study period (term) to be paid.',
  },
  {
    circumstance:
      'The student does not commence on the agreed start date and has not previously withdrawn.',
    refundDue: 'No refund. Fees for full study period (term) to be paid.',
  },
  {
    circumstance: 'Student withdraws after commencement.',
    refundDue: 'No refund. Fees for full study period (term) to be paid.',
  },
  {
    circumstance:
      'Student’s enrolment is cancelled due to disciplinary action.',
    refundDue: 'No refund. Fees for full study period (term) to be paid.',
  },
  {
    circumstance: 'Student breaches a visa condition',
    refundDue: 'No refund. Fees for full study period (term) to be paid.',
  },
  {
    circumstance:
      'The student has supplied incorrect or incomplete information causing Ashford College to withdraw the offer.',
    refundDue: 'No refund. Fees for full study period (term) to be paid.',
  },
  {
    circumstance:
      'The student is refused a visa because they did not pay, start their course at the agreed location on the agreed starting day or they withdrew from their course with Ashford College.',
    refundDue: 'No refund. Fees for full study period (term) to be paid.',
  },
  {
    circumstance:
      'The student is refused a visa and therefore does not commence their course on the agreed starting day or withdraws from the course on or before the agreed starting day because of the visa refusal.',
    refundDue:
      'The total amount of all course fees (tuition and any non-tuition fees) received or less whichever is the lower amount of 5% of the total amount of the fees or the sum of $500.',
  },
  {
    circumstance:
      'The student is refused a visa and has already commenced their course.',
    refundDue:
      'The student will not be entitled to a refund for the tuition fees of the current term or study period and will remain liable for these fees. However, any unexpended (unused) or pre-paid tuition fees for future terms or study periods will be refunded according to the terms outlined in this refund policy',
  },
];

const CAMPUS_LOCATIONS = [
  'Geelong Campus - Level 3/65, Brougham Street, Geelong VIC - 3220 (Head Office)',
  'Melbourne Campus - 5G - 6G, 427 Docklands Drive, Docklands, VIC - 3008',
  'Carpentry Workshop - 7/4 Integration Court, Truganina VIC 3029',
  'Training Kitchen - 47-51 Boundary Road, North Melbourne VIC - 3051',
  'Painting and decoration - 7/5 Integration Court, Truganina VIC 3029',
  'Building and Construction - Multiple Construction Sites',
];

const ADDITIONAL_FEES = [
  { name: 'Deferment Fee', amount: '$200.00' },
  { name: 'Application fees', amount: '$250.00' },
  { name: 'Change of CoE', amount: '$50.00' },
  {
    name: 'Extend of Course Duration',
    amount: 'As per the current fee schedule',
  },
  { name: 'Supplementary Assessment', amount: '2 free re-assessment attempts' },
  {
    name: 'Supplementary Assessment',
    amount: '$100/after two free resubmission attempts',
  },
  { name: 'Re-Assessment fee for practical based unit', amount: '$250.00' },
  { name: 'Unit repeat Cost', amount: '$500' },
  { name: 'Replacement Student ID', amount: '$20.00' },
  { name: 'Work Based Training (WBT) fee', amount: 'Confirmation on request' },
  { name: 'Credit Transfer before COE is issued', amount: 'No Charge' },
  { name: 'Credit Transfer after COE is issued', amount: '$200.00' },
  { name: 'RPL fees', amount: '$250.00 Application fees and $250.00 per unit' },
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
      '$20 p/hr (starts when student fails to attend more than 20%) of class contact hours)',
  },
  {
    name: 'Fees for late payment of fees',
    amount: '$100 per week for each week the payment for fees is delayed',
  },
  { name: 'Fees for late submission of assessment', amount: '$100' },
];

// Helper to calculate expected completion date (raw ISO date string) from learning subjects
const calculateExpectedCompletionDateRaw = (
  learningSubjects?: Array<{ planned_end_date: string }> | null
): string | null => {
  // If we have learning subjects, use the maximum end date
  if (learningSubjects && learningSubjects.length > 0) {
    const maxEndDate = learningSubjects.reduce((max, subject) => {
      const subjectEndDate = new Date(subject.planned_end_date);
      return subjectEndDate > max ? subjectEndDate : max;
    }, new Date(learningSubjects[0].planned_end_date));

    return maxEndDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }

  // Fallback: if no learning plan exists yet, return null
  return null;
};

// Calculate total weeks from start to end date (both in YYYY-MM-DD format)
const calculateTotalWeeks = (
  startDate?: string | null,
  endDate?: string | null
): string => {
  if (!startDate || !endDate) return '52'; // Fallback

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return String(diffWeeks);
};

export function buildOfferLetterData(input: {
  application: AppRow;
  schedule: ScheduleRow[];
  rtoLogoUrl?: string | null;
}): OfferLetterData {
  const { application, schedule, rtoLogoUrl } = input;
  const program = application.programs ?? null;
  const rto = application.rtos;

  const totalCents = schedule.reduce(
    (sum, r) => sum + (r.amount_cents ?? 0),
    0
  );

  // Address Construction
  const fullRtoAddress =
    [rto?.address_line_1, rto?.suburb, rto?.state, rto?.postcode]
      .filter(Boolean)
      .join(' ') || 'Level 3/65 Brougham Street, Geelong VIC - 3220';

  // Calculate expected completion date from learning subjects (raw ISO date)
  const expectedCompletionDateRaw = calculateExpectedCompletionDateRaw(
    application.application_learning_subjects
  );

  // Format for display
  const expectedCompletionDate = expectedCompletionDateRaw
    ? formatDate(expectedCompletionDateRaw)
    : '';

  // Calculate total weeks from start to end date (using raw dates)
  const totalWeeks = calculateTotalWeeks(
    application.proposed_commencement_date,
    expectedCompletionDateRaw || undefined
  );

  return {
    institution: {
      name: rto?.name ?? 'Ashford College',
      addressLine: fullRtoAddress,
      email: rto?.email_address ?? 'info@ashford.edu.au',
      phone: rto?.phone_number ?? '0423 513 282',
      website: 'www.ashford.edu.au',
      rtoCode: rto?.rto_code ?? '46296',
      cricosCode: rto?.cricos_code ?? '04304G',
      logoSrc: rtoLogoUrl ?? rto?.profile_image_path ?? '',
    },
    document: {
      titleStrip: 'Offer Letter and International Student Agreement',
      versionLine:
        'V2.1: November 2024, Approved: PEO, Next Review: November 2025',
      docTitle: 'Letter of Offer',
    },
    offer: {
      offerLetterId: application.application_id_display ?? application.id,
      date: formatDate(new Date().toISOString()),
      addresseeLine1:
        `${application.salutation ?? ''} ${(application.first_name ?? '').toUpperCase()} ${(application.last_name ?? '').toUpperCase()}`.trim(),
      addresseeLine2:
        [
          application.address_line_1,
          application.suburb,
          application.state,
          application.postcode,
        ]
          .filter(Boolean)
          .join(' ') || '',
      agency: application.agents?.name ?? 'N/A',
      greetingName:
        `${(application.first_name ?? '').toUpperCase()} ${(application.last_name ?? '').toUpperCase()}`.trim(),
    },
    student: {
      studentId: application.application_id_display ?? application.id, // Fixed: use application_id_display
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
      cricosCourseCode: '117132E', // Should come from Program DB if available
      courseCode: program?.code ?? '',
      courseName: program?.name ?? '',
      startDate: formatDate(application.proposed_commencement_date),
      endDate: expectedCompletionDate, // Use calculated date
      location: 'Geelong',
      hoursPerWeek: '20',
      totalWeeks: totalWeeks, // Calculate from actual dates
      agreedStartDate: formatDate(application.proposed_commencement_date),
      expectedEndDate: expectedCompletionDate, // Use calculated date
      locationsList: CAMPUS_LOCATIONS,
    },
    conditionsOfOffer: [], // Add logic if you store conditions in DB
    hoursPerWeekClause: '20 hours a week in the classroom',
    entryRequirementText:
      'For the entry requirement for each course please refer to the course information brochure or follow the information on https://ashford.edu.au/',
    paymentPlan: {
      enrolId: application.id,
      rows: schedule
        .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
        .map((r) => ({
          date: formatDate(r.due_date),
          feeType: r.name,
          amount: formatCurrency(r.amount_cents),
        })),
      totalCourseFees: formatCurrency(totalCents),
    },
    // Dynamic Banking with 'Correct PDF' Fallbacks
    bank: {
      accountName: rto?.bank_account_name ?? 'Ashford College Pty Ltd',
      bank: rto?.bank_name ?? 'National Australia Bank',
      bsb: rto?.bank_bsb ?? '083543',
      accountNumber: rto?.bank_account_number ?? '936919284',
      swiftCode: 'NATAAU3303M', // Hardcoded as per correct PDF
    },
    refundsBlocks: {
      intro: [
        'We want to make sure you understand all fees and charges associated with your course so please carefully read this section before signing the Student Agreement. Any fees and charges documented in the agreement will not change during the duration of your course.',
        'We protect your fees at all times by:',
        '• Maintaining a sufficient amount in our account so that so we are able to repay all tuition fees already paid.',
        '• Through our membership of the Tuition Protection Scheme (TPS). The role of the TPS is to assist international students where we are unable to fully deliver their course of study. The TPS ensures that you are able to either complete their studies in another course or with another education provider or receive a refund of your unspent tuition fees.',
        '• Not requiring you to pay more than 50% of course fees prior to commencement, except where a course is less than 26 weeks. However, you may choose to pay your fees in full or a greater amount than 50%. Please contact us if you would like to pay more than is documented in your student agreement.',
      ],
      additionalFeesNotice:
        'Please note that the following fees can apply in addition to the fees advertised on the Website. Additional fees that may apply are given below:',
    },
    additionalFees: ADDITIONAL_FEES,
    refundsCircumstances: REFUND_POLICIES,
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
        'We will acknowledge your complaint or appeal in writing within 5 working days of receipt. We will commence review of your complaint or appeal within 5 working days. Complaints and appeals will be finalised as soon as practicable or within 30 calendar days. However, where the complaint or appeal is expected to take more than 60 calendar days to process, Ashford College will write to inform the complainant or appellant of this including the reasons for such. Following this update, regular updates will be provided of progress.',
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
      ],
      ombudsmanUrl: 'http://www.ombudsman.gov.au/',
      hotlinePhone: '13 38 73',
      hotlineEmail: 'ntch@education.gov.au',
      asqaUrl: 'https://www.asqa.gov.au/complaints',
      consumerLawNote:
        'Nothing in this policy and procedure limits the rights of an individual to take action under Australia’s Consumer Protection laws and it does not circumscribe an individual’s rights to pursue other legal remedies.',
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
      deseUrl: 'https://www.dese.gov.au/national-vet-data/vet-privacy-notice',
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
        'This document sets outs the agreement between you and Ashford College. This Written Agreement, and the right to make complaints and seek appeals of decisions and action under various processes, does not affect the rights of the student to take action under the Australian Consumer Law if the Australian Consumer Law applies.',
        'The terms and conditions listed in this document are subject to change at any time by the management’s discretion and without prior notice. For the most up-to-date version, please refer to our website, ausc.edu.au',
        'By signing the declaration below, you are agreeing to this Student Agreement and all of the associated terms and conditions included with this Student Agreement.',
        'You must keep a copy of this Student Agreement and payment evidence for all tuition and non-tuition fees. We will also keep a record of his Student Agreement and payment receipts for all tuition and non-tuition fee for at least 2 years after you have completed or withdrawn from your course.',
        'I confirm that the details in this Student Agreement are correct and that I accept all terms and conditions documented in this agreement.',
      ],
      websiteMention: 'www.ashford.edu.au',
      namePlaceholder:
        `${(application.first_name ?? '').toUpperCase()} ${(application.last_name ?? '').toUpperCase()}`.trim(),
    },
    metaFooter: {
      leftCode: `RTO Code: ${rto?.rto_code ?? '46296'} | CRICOS Code: ${rto?.cricos_code ?? '04304G'}`,
      version: 'V2.1: November 2024, Approved: PEO, Next Review: November 2025',
    },
  };
}
