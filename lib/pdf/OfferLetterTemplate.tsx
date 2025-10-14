/**
 * Node-runtime React-PDF template for Offer Letter
 * Compatible with Next.js API Route (runtime: 'nodejs')
 */
import React, { createElement } from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
} from '@react-pdf/renderer';

export type OfferLetterData = {
  institution: {
    name: string;
    addressLine: string;
    email: string;
    phone: string;
    website: string;
    rtoCode: string;
    cricosCode: string;
    logoSrc: string;
  };
  document: { titleStrip: string; versionLine: string; docTitle: string };
  offer: {
    offerLetterId: string;
    date: string;
    addresseeLine1: string;
    addresseeLine2: string;
    agency: string;
    greetingName: string;
  };
  student: {
    studentId: string;
    firstName: string;
    surname: string;
    dateOfBirth: string;
    nationality: string;
    gender: string;
    passportNo: string;
    phone: string;
    email: string;
  };
  course: {
    proposalNo: string;
    cricosCourseCode: string;
    courseCode: string;
    courseName: string;
    startDate: string;
    endDate: string;
    location: string;
    hoursPerWeek: string;
    totalWeeks: string;
    agreedStartDate: string;
    expectedEndDate: string;
    locationsList: string[];
  };
  conditionsOfOffer?: string[];
  hoursPerWeekClause: string;
  entryRequirementText: string;
  paymentPlan: {
    enrolId: string;
    rows: Array<{ date: string; feeType: string; amount: string }>;
    totalCourseFees: string;
  };
  bank: {
    accountName: string;
    bank: string;
    bsb: string;
    accountNumber: string;
    swiftCode: string;
  };
  refundsBlocks: { intro: string[]; additionalFeesNotice: string };
  additionalFees: Array<{ name: string; amount: string }>;
  refundsCircumstances: Array<{ circumstance: string; refundDue: string }>;
  complaintsAppeals: {
    paragraphs: string[];
    bulletsInternationalStudents: string[];
    ombudsmanUrl: string;
    hotlinePhone: string;
    hotlineEmail: string;
    asqaUrl: string;
    consumerLawNote: string;
  };
  privacy: {
    whyCollect: string[];
    howUse: string[];
    howDisclose: string[];
    ncverHandlingIntro: string[];
    ncverPurposes: string[];
    ncverMore: string[];
    deseNote: string;
    deseUrl: string;
    surveys: string;
    contactInfo: string[];
    changeOfContactRequirement: string;
  };
  studentDeclaration: {
    paragraphs: string[];
    websiteMention: string;
    namePlaceholder: string;
  };
  metaFooter: { leftCode: string; version: string };
};

const COLORS = {
  text: '#202124',
  lightText: '#4a4f55',
  primary: '#7d191e',
  border: '#D8DADD',
  zebra: '#F7F8FA',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 42,
    color: COLORS.text,
    fontSize: 10.5,
    lineHeight: 1.35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logo: { width: 110, height: 52 },
  instBlock: { flex: 1 },
  instName: { fontSize: 14, fontWeight: 700 },
  instLine: { fontSize: 9.5, color: COLORS.lightText },
  strip: { marginTop: 6, fontSize: 9, color: COLORS.lightText },
  docMetaRow: { marginTop: 6, fontSize: 8.5, color: COLORS.lightText },
  sectionTitle: {
    marginTop: 16,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: 700,
  },
  paragraph: { marginTop: 10, fontSize: 10.5 },
  small: { fontSize: 9.5, color: COLORS.lightText },
  twoCol: { flexDirection: 'row', gap: 24 },
  keyValRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  table: { marginTop: 12, borderWidth: 1, borderColor: COLORS.border },
  thead: {
    flexDirection: 'row',
    backgroundColor: COLORS.zebra,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tbodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cell: { paddingVertical: 8, paddingHorizontal: 8, fontSize: 10 },
  bold: { fontWeight: 700 },
  col_date: { width: '16%' },
  col_feeType: { width: '44%' },
  col_amount: { width: '20%', textAlign: 'right' },
  col_feeName: { width: '60%' },
  col_feeAmt: { width: '40%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    left: 42,
    right: 42,
    bottom: 24,
    fontSize: 9,
    color: COLORS.lightText,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageNum: { fontSize: 9, color: COLORS.lightText },
  inlineLink: { color: COLORS.primary, textDecoration: 'none' },
  banner: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  bannerText: { color: 'white', fontSize: 12, fontWeight: 700 },
  declTable: { marginTop: 10, borderWidth: 1, borderColor: COLORS.text },
  declRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.text,
  },
  declCellLabel: {
    width: '35%',
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 10.5,
  },
  declCellValue: {
    width: '65%',
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 10.5,
  },
  rule: { marginTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  listItem: { marginLeft: 10, marginTop: 6 },
});

const Paragraphs = ({ lines }: { lines: string[] }) => (
  <>
    {lines.map((t, i) => (
      <Text key={i} style={styles.paragraph}>
        {t}
      </Text>
    ))}
  </>
);

const Header = ({
  data,
  pageNum,
  total,
}: {
  data: OfferLetterData;
  pageNum: number;
  total: number;
}) => (
  <View style={styles.header}>
    {/* Use absolute URL or data URI for logoSrc */}
    {data.institution.logoSrc ? (
      <Image style={styles.logo} src={data.institution.logoSrc} />
    ) : (
      <View />
    )}
    <View style={styles.instBlock}>
      <Text style={styles.instName}>{data.institution.name}</Text>
      <Text style={styles.instLine}>{data.institution.addressLine}</Text>
      <Text style={styles.instLine}>
        E: {data.institution.email} | T: {data.institution.phone}
      </Text>
      <Text style={styles.instLine}>W: {data.institution.website}</Text>
      <Text style={styles.strip}>{data.document.titleStrip}</Text>
      <Text style={styles.docMetaRow}>{data.metaFooter.leftCode}</Text>
      <Text style={styles.docMetaRow}>{data.document.versionLine}</Text>
    </View>
  </View>
);

const Footer = ({
  data,
  pageNum,
  total,
}: {
  data: OfferLetterData;
  pageNum: number;
  total: number;
}) => (
  <View style={styles.footer} fixed>
    <Text>{data.metaFooter.leftCode}</Text>
    <Text style={styles.pageNum}>
      Page {pageNum} of {total}
    </Text>
  </View>
);

export const OfferLetterTemplate: React.FC<{ data: OfferLetterData }> = ({
  data,
}) => (
  <Document title="Offer Letter and International Student Agreement">
    {/* Page 1 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={1} total={12} />
      <Text style={styles.sectionTitle}>{data.document.docTitle}</Text>
      <View style={styles.rule} />
      <View style={{ marginTop: 8 }}>
        <Text>
          <Text style={styles.bold}>Offer Letter ID:</Text>{' '}
          {data.offer.offerLetterId}
        </Text>
        <Text style={{ marginTop: 4 }}>
          <Text style={styles.bold}>Date:</Text> {data.offer.date}
        </Text>
        <Text style={{ marginTop: 4 }}>
          <Text style={styles.bold}>Agent:</Text> {data.offer.agency}
        </Text>
      </View>
      <View style={{ marginTop: 10 }}>
        <Text>{data.offer.addresseeLine1}</Text>
        <Text>{data.offer.addresseeLine2}</Text>
      </View>

      <View style={{ marginTop: 10 }}>
        <Text>Dear {data.offer.greetingName},</Text>
      </View>
      <Paragraphs
        lines={[
          'We are delighted to inform you that your application to enroll with us has been accepted.',
          'Please carefully check all the details of your enrolment and the terms and conditions. If there is any changes to be made to your details or any information that you are unsure about, please contact us.',
          'Once you are satisfied that all of the information is correct and you understand and agree the terms and conditions, please complete the declaration at the end and return it to us.',
          'Once we receive your declaration, we will send you a tax invoice which you should pay immediately to secure your place.',
          'Upon completion of all of the above, your Electronic Confirmation of Enrolment will be sent to you.',
          'We look forward to welcoming you.',
        ]}
      />
      <View style={{ marginTop: 12 }}>
        <Text>Kind regards,</Text>
        <Text>Administration Team</Text>
      </View>
      <View style={{ marginTop: 10 }}>
        <Text>E:{data.institution.email}</Text>
        <Text>P: {data.institution.phone}</Text>
      </View>
      <Footer data={data} pageNum={1} total={12} />
    </Page>

    {/* Page 2 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={2} total={12} />
      <Text style={styles.sectionTitle}>Accepting this offer</Text>
      <View style={styles.rule} />
      <Paragraphs
        lines={[
          'To confirm your enrolment into this course you are required to:',
          '1. Check all your personal details to ensure they are correct.',
          '2. Carefully read all of the information in this Student Agreement. If there is anything that you do not understand, please contact us.',
          '3. Sign and date this agreement and return it to us once you are satisfied that all details are correct and that you understand the terms and conditions.',
          '4. You should also keep a copy of this agreement for your records as stated under the Student Declaration.',
          '5. Once we receive your signed agreement and payment you will be forwarded your Confirmation of Enrolment.',
        ]}
      />
      <View style={{ marginTop: 14 }}>
        <Text>All payments are to be made into the following account:</Text>
        <View style={{ marginTop: 8 }}>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>Account name:</Text>
            <Text>{data.bank.accountName}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>Bank:</Text>
            <Text>{data.bank.bank}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>BSB:</Text>
            <Text>{data.bank.bsb}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>Account number:</Text>
            <Text>{data.bank.accountNumber}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>SWIFT Code:</Text>
            <Text>{data.bank.swiftCode}</Text>
          </View>
        </View>
      </View>
      <Footer data={data} pageNum={2} total={12} />
    </Page>

    {/* Page 3 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={3} total={12} />
      <Text style={styles.small}>
        * carefully check all of the details below to make sure they are correct
      </Text>
      <Text style={styles.sectionTitle}>Student Details</Text>
      <View style={styles.rule} />
      <View style={styles.twoCol}>
        <View>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>Student ID:</Text>
            <Text>{data.student.studentId}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>First Name:</Text>
            <Text>{data.student.firstName}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>Surname:</Text>
            <Text>{data.student.surname}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>Date of Birth:</Text>
            <Text>{data.student.dateOfBirth}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>Nationality:</Text>
            <Text>{data.student.nationality}</Text>
          </View>
        </View>
        <View>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>Gender:</Text>
            <Text>{data.student.gender}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>Passport No:</Text>
            <Text>{data.student.passportNo}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>Phone:</Text>
            <Text>{data.student.phone}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text style={styles.bold}>Email:</Text>
            <Text>{data.student.email}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Course Details</Text>
      <View style={styles.rule} />
      <View style={{ marginTop: 6 }}>
        <View style={styles.keyValRow}>
          <Text style={styles.bold}>Proposal #:</Text>
          <Text>{data.course.proposalNo}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text style={styles.bold}>CRICOS Course Code:</Text>
          <Text>{data.course.cricosCourseCode}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text style={styles.bold}>Course Code:</Text>
          <Text>{data.course.courseCode}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text style={styles.bold}>Course Name:</Text>
          <Text>{data.course.courseName}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text style={styles.bold}>Start Date:</Text>
          <Text>{data.course.startDate}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text style={styles.bold}>End Date:</Text>
          <Text>{data.course.endDate}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text style={styles.bold}>Location:</Text>
          <Text>{data.course.location}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text style={styles.bold}>Hrs/Week:</Text>
          <Text>{data.course.hoursPerWeek}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text style={styles.bold}>Total Duration Weeks:</Text>
          <Text>{data.course.totalWeeks}</Text>
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
        <Text>
          <Text style={styles.bold}>Agreed Start Date:</Text>{' '}
          {data.course.agreedStartDate}
        </Text>
        <Text style={{ marginTop: 4 }}>
          <Text style={styles.bold}>Expected End Date:</Text>{' '}
          {data.course.expectedEndDate}
        </Text>
      </View>
      <View style={{ marginTop: 12 }}>
        <Text style={styles.bold}>Course Locations:</Text>
        {data.course.locationsList.map((line, idx) => (
          <Text key={idx} style={styles.listItem}>
            - {line}
          </Text>
        ))}
      </View>
      <View style={{ marginTop: 10 }}>
        <Text style={styles.small}>
          NOTE: YOU MUST ADVISE THE COLLEGE OF ANY CHANGE IN ADDRESS WHILE
          ENROLLED IN THE COURSE
        </Text>
      </View>
      <Footer data={data} pageNum={3} total={12} />
    </Page>

    {/* Page 4 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={4} total={12} />
      <View style={{ marginTop: 12 }}>
        <Text style={styles.bold}>Condition(s) of the Offer:</Text>
        {(data.conditionsOfOffer ?? []).map((c, i) => (
          <Text key={i}>- {c}</Text>
        ))}
      </View>
      <View>
        <View style={styles.keyValRow}>
          <Text style={styles.bold}>Hours per week:</Text>
          <Text>{data.hoursPerWeekClause}</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={styles.bold}>Entry requirement:</Text>
          <Text style={{ marginTop: 4 }}>
            {' '}
            For the entry requirement for each course please refer to the course
            information brochure or follow the information on
            https://ashford.edu.au/
          </Text>
        </View>
        <View style={{ marginTop: 10 }}>
          <Text style={styles.bold}>Payment of Fees:</Text>
          <Text style={{ marginTop: 4 }}>
            Payment must include the following: All fees are in Australian
            dollars (AUD)
          </Text>
        </View>
      </View>
      <View style={styles.table}>
        <View style={styles.thead}>
          <Text style={[styles.cell, styles.bold, styles.col_date]}>
            Due Date
          </Text>
          <Text style={[styles.cell, styles.bold, styles.col_feeType]}>
            Fees
          </Text>
          <Text style={[styles.cell, styles.bold, styles.col_amount]}>
            Amount
          </Text>
        </View>
        {data.paymentPlan.rows.map((r, idx) => (
          <View
            key={idx}
            style={[
              styles.tbodyRow,
              { backgroundColor: idx % 2 === 1 ? COLORS.zebra : 'white' },
            ]}
          >
            <Text style={[styles.cell, styles.col_date]}>{r.date}</Text>
            <Text style={[styles.cell, styles.col_feeType]}>{r.feeType}</Text>
            <Text style={[styles.cell, styles.col_amount]}>{r.amount}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
        <Text style={{ fontWeight: 700 }}>
          Total Course Fees: {data.paymentPlan.totalCourseFees}
        </Text>
      </View>
      <Footer data={data} pageNum={4} total={12} />
    </Page>

    {/* Pages 6–12: Policies, fees, privacy, declaration */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={6} total={12} />
      <Text style={styles.sectionTitle}>International Student Agreement</Text>
      <View style={styles.rule} />
      <Text style={styles.bold}>Fees and Refunds</Text>
      <Paragraphs lines={data.refundsBlocks.intro} />
      <Text style={styles.paragraph}>
        {data.refundsBlocks.additionalFeesNotice}
      </Text>
      <Footer data={data} pageNum={6} total={12} />
    </Page>

    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={7} total={12} />
      <Text style={styles.sectionTitle}>Additional fees that may apply</Text>
      <View style={styles.rule} />
      <View style={styles.table}>
        <View style={styles.thead}>
          <Text style={[styles.cell, styles.bold, styles.col_feeName]}>
            Additional fees that may apply
          </Text>
          <Text style={[styles.cell, styles.bold, styles.col_feeAmt]}>
            Amount
          </Text>
        </View>
        {data.additionalFees.map((f, idx) => (
          <View
            key={idx}
            style={[
              styles.tbodyRow,
              { backgroundColor: idx % 2 === 1 ? COLORS.zebra : 'white' },
            ]}
          >
            <Text style={[styles.cell, styles.col_feeName]}>{f.name}</Text>
            <Text style={[styles.cell, styles.col_feeAmt]}>{f.amount}</Text>
          </View>
        ))}
      </View>
      <Text>
        If these fees apply, they will be charged as above. You are required to
        pay all fees and charges by the date indicated on the invoice. Where you
        are unable to make a payment by the specified date, please contact us to
        discuss alternative arrangements.
      </Text>
      <Text>
        All payments are to be made by bank transfer into the account specified
        on the invoice.
      </Text>
      <Text>
        Where fees (except for addition fee) are overdue and you have not made
        alternative arrangements, a first warning, second warning and notice of
        intention to report regarding non-payment of fees will be sent to you as
        follows:
      </Text>
      <Text>
        1. First warning letter: failing to pay an invoice within 5 days of
        receipt or contacting us to make alternative arrangements.
      </Text>
      <Text>
        2. Second warning letter: failing to pay an invoice within 5 days of
        receipt of the first warning letter or contacting us to make alternative
        arrangements.
      </Text>
      <Text>
        3. Notice of intention to report: failing to pay an invoice within 5
        days of receipt of the second warning letter or contacting us to make
        alternative arrangements.
      </Text>
      <Text style={styles.bold}>
        {' '}
        Following the cancelation of enrolment due to non-payment of fees, your
        debt will be referred to a debt collection agency. *Please note that the
        initial deposit is $1500{' '}
      </Text>
      <Footer data={data} pageNum={7} total={12} />
    </Page>

    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={8} total={12} />
      <View style={styles.table}>
        <View style={styles.thead}>
          <Text style={[styles.cell, styles.bold, { width: '48%' }]}>
            Circumstance
          </Text>
          <Text style={[styles.cell, styles.bold, { width: '52%' }]}>
            Refund due
          </Text>
        </View>
        {data.refundsCircumstances.map((row, idx) => (
          <View
            key={idx}
            style={[
              styles.tbodyRow,
              { backgroundColor: idx % 2 === 1 ? COLORS.zebra : 'white' },
            ]}
          >
            <Text style={[styles.cell, { width: '48%' }]}>
              {row.circumstance}
            </Text>
            <Text style={[styles.cell, { width: '52%' }]}>{row.refundDue}</Text>
          </View>
        ))}
      </View>
      <Footer data={data} pageNum={8} total={12} />
    </Page>

    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={9} total={12} />
      <Text style={styles.sectionTitle}>Complaints and Appeals</Text>
      <View style={styles.rule} />
      <Paragraphs lines={data.complaintsAppeals.paragraphs} />
      <Text>
        International students may complain to the OSO about a range of
        circumstances including:
      </Text>
      {data.complaintsAppeals.bulletsInternationalStudents.map((b, i) => (
        <Text key={i}>- {b}</Text>
      ))}
      <View style={{ marginTop: 10 }}>
        <Text>More information can be found at:</Text>
        <Link
          src={data.complaintsAppeals.ombudsmanUrl}
          style={styles.inlineLink}
        >
          {data.complaintsAppeals.ombudsmanUrl}
        </Link>
      </View>
      <Paragraphs
        lines={[
          'You can access this service at no cost in relation to matters that cannot be resolved through internal processes. Further information and contact details are included below.',
          'We will cooperate in full with the OSO and will immediately implement their decisions or recommendations and/or take preventative or corrective action required by the decision or recommendation.',
          'Complaints can also be made to the organisations indicated below:',
          'We will communicate all actions to you in writing based on the OSO’s decision.',
        ]}
      />
      <Footer data={data} pageNum={9} total={12} />
    </Page>

    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={10} total={12} />
      <Text style={styles.bold}>National Training Complaints Hotline</Text>
      <Paragraphs
        lines={[
          'The National Training Complaints Hotline is a national service for consumers to register complaints concerning vocational education and training.   The service refers consumers to the appropriate agency/authority/jurisdiction to assist with their complaint. Access to the Hotline is through:',
        ]}
      />
      <Paragraphs
        lines={[
          `Phone: ${data.complaintsAppeals.hotlinePhone}, Monday–Friday, 8am to 6pm nationally`,
          `Email: ${data.complaintsAppeals.hotlineEmail}`,
        ]}
      />
      <Text style={styles.bold}>
        Australian Skills Quality Authority (ASQA)
      </Text>
      <Paragraphs
        lines={[
          'ASQA does not act as an advocate for individual students and is not responsible for resolving disputes between students and training providers. ASQA only uses information from all complaints as intelligence to inform regulatory activities.',
        ]}
      />
      <Link src={data.complaintsAppeals.asqaUrl} style={styles.inlineLink}>
        {data.complaintsAppeals.asqaUrl}
      </Link>
      <Paragraphs lines={[data.complaintsAppeals.consumerLawNote]} />
      <Text style={styles.sectionTitle}>Privacy Notice</Text>
      <View style={styles.rule} />
      <Text>Why we collect your personal information</Text>
      <Paragraphs lines={data.privacy.whyCollect} />
      <Text>How we use your personal information</Text>
      <Paragraphs lines={data.privacy.howUse} />
      <Footer data={data} pageNum={10} total={12} />
    </Page>

    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={11} total={12} />
      <Text>How we disclose your personal information</Text>
      <Paragraphs lines={data.privacy.howDisclose} />
      <Text>
        How the NCVER and other bodies handle your personal information
      </Text>
      <Paragraphs lines={data.privacy.ncverHandlingIntro} />
      <View style={{ marginTop: 6 }}>
        {data.privacy.ncverPurposes.map((p, i) => (
          <Text key={i}>• {p}</Text>
        ))}
      </View>
      <Paragraphs lines={data.privacy.ncverMore} />
      <Text>{data.privacy.deseNote}</Text>
      <Link src={data.privacy.deseUrl} style={styles.inlineLink}>
        {data.privacy.deseUrl}
      </Link>
      <Text>Surveys</Text>
      <Text>{data.privacy.surveys}</Text>
      <Text>Contact information</Text>
      {/* first line as intro */}
      {data.privacy.contactInfo.length > 0 ? (
        <Text style={{ marginTop: 8 }}>{data.privacy.contactInfo[0]}</Text>
      ) : null}
      {/* bullets */}
      <View style={{ marginTop: 6 }}>
        {data.privacy.contactInfo
          .slice(1, data.privacy.contactInfo.length - 1)
          .map((line, idx) => (
            <Text key={idx}>• {line.replace(/^•\s*/, '')}</Text>
          ))}
      </View>
      {/* closing line if present */}
      {data.privacy.contactInfo.length > 1 ? (
        <Text style={{ marginTop: 8 }}>
          {data.privacy.contactInfo[data.privacy.contactInfo.length - 1]}
        </Text>
      ) : null}
      <Text style={styles.sectionTitle}>
        Requirement to provide change of contact details
      </Text>
      <View style={styles.rule} />
      <Paragraphs lines={[data.privacy.changeOfContactRequirement]} />
      <Footer data={data} pageNum={11} total={12} />
    </Page>

    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={12} total={12} />
      {/* Banner title */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>Student Declaration</Text>
      </View>
      {/* Exact paragraphs as per specification */}
      <Paragraphs
        lines={[
          'This document sets outs the agreement between you and Ashford College . This Written Agreement, and the right to make complaints and seek appeals of decisions and action under various processes, does not affect the rights of the student to take action under the Australian Consumer Law if the Australian Consumer Law applies.',
          'The terms and conditions listed in this document are subject to change at any time by the management’s discretion and without prior notice. For the most up-to-date version, please refer to our website, ausc.edu.au',
          'By signing the declaration below, you are agreeing to this Student Agreement and all of the associated terms and conditions included with this Student Agreement.',
          'You must keep a copy of this Student Agreement and payment evidence for all tuition and non-tuition fees. We will also keep a record of his Student Agreement and payment receipts for all tuition and non-tuition fee for at least 2 years after you have completed or withdrawn from your course.',
          'I confirm that the details in this Student Agreement are correct and that I accept all terms and conditions documented in this agreement.',
        ]}
      />
      {/* Two-column declaration table */}
      <View style={styles.declTable}>
        <View style={{ flexDirection: 'row' }}>
          <Text
            style={[
              styles.declCellLabel,
              { borderRightWidth: 1, borderRightColor: COLORS.text },
            ]}
          >
            Student name
          </Text>
          <Text style={styles.declCellValue}>
            {data.studentDeclaration.namePlaceholder}
          </Text>
        </View>
        <View style={styles.declRow}>
          <Text
            style={[
              styles.declCellLabel,
              { borderRightWidth: 1, borderRightColor: COLORS.text },
            ]}
          >
            Signature
          </Text>
          <Text style={styles.declCellValue}> </Text>
        </View>
        <View style={styles.declRow}>
          <Text
            style={[
              styles.declCellLabel,
              { borderRightWidth: 1, borderRightColor: COLORS.text },
            ]}
          >
            Date
          </Text>
          <Text style={styles.declCellValue}> </Text>
        </View>
      </View>
      <Footer data={data} pageNum={12} total={12} />
    </Page>
  </Document>
);
