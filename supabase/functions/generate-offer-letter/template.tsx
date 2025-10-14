/** @jsxRuntime classic */
/** @jsx createElement */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
} from 'https://esm.sh/@react-pdf/renderer@3.4.3?target=deno&external=react';
import { createElement } from 'https://esm.sh/react@18.2.0?target=deno';

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
    ncverHandling: string[];
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
  primary: '#0B3D91',
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
  instName: { fontSize: 14 },
  instLine: { fontSize: 9.5, color: COLORS.lightText },
  strip: { marginTop: 6, fontSize: 9, color: COLORS.lightText },
  docMetaRow: { marginTop: 6, fontSize: 8.5, color: COLORS.lightText },
  sectionTitle: { marginTop: 16, fontSize: 13, color: COLORS.primary },
  paragraph: { marginTop: 8, fontSize: 10.5 },
  small: { fontSize: 9.5, color: COLORS.lightText },
  twoCol: { flexDirection: 'row', gap: 24 },
  keyValRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  table: { marginTop: 10, borderWidth: 1, borderColor: COLORS.border },
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
  cell: { paddingVertical: 6, paddingHorizontal: 8, fontSize: 10 },
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
    <Image style={styles.logo} src={data.institution.logoSrc} />
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

export const OfferLetterTemplate = ({ data }: { data: OfferLetterData }) => (
  <Document title="Offer Letter and International Student Agreement">
    {/* Page 1 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={1} total={12} />
      <Text style={styles.sectionTitle}>{data.document.docTitle}</Text>
      <View style={{ marginTop: 8 }}>
        <Text>
          <Text style={styles.bold}>Offer Letter ID:</Text>{' '}
          {data.offer.offerLetterId}
        </Text>
        <Text style={{ marginTop: 4 }}>
          <Text style={styles.bold}>Date:</Text> {data.offer.date}
        </Text>
      </View>
      <View style={{ marginTop: 10 }}>
        <Text>{data.offer.addresseeLine1}</Text>
        <Text>{data.offer.addresseeLine2}</Text>
      </View>
      <View style={{ marginTop: 10 }}>
        <Text>
          <Text style={styles.bold}>Agency:</Text> {data.offer.agency}
        </Text>
      </View>
      <View style={{ marginTop: 10 }}>
        <Text>Dear {data.offer.greetingName},</Text>
      </View>
      <Paragraphs
        lines={[
          'We are delighted to inform you that your application to enroll with us has been accepted.',
          'Please carefully check all the details of your enrolment and the terms and conditions. If there is any changes to be made to your details or any information that you are unsure about, please contact us.',
          'Once you are satisfied that all of the information is correct and you understand and agree the terms and conditions, please complete the declaration  at the end and return it to us.',
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
      <Paragraphs
        lines={[
          'To confirm your enrolment into this course you are required to:',
          'Check all your personal details to ensure they are correct.',
          'Carefully read all of the information in this Student Agreement. If there is anything that you do not understand, please contact us.',
          'Sign and date this agreement and return it to us once you are satisfied that all details are correct and that you understand the terms and conditions.',
          'You should also keep a copy of this agreement for your records as stated under the Student Declaration.',
          'Once we receive your signed agreement and payment you will be forwarded your Confirmation of Enrolment.',
        ]}
      />
      <View style={{ marginTop: 14 }}>
        <Text>All payments are to be made into the following account:</Text>
        <View style={{ marginTop: 8 }}>
          <View style={styles.keyValRow}>
            <Text>Account name</Text>
            <Text>{data.bank.accountName}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text>Bank</Text>
            <Text>{data.bank.bank}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text>BSB</Text>
            <Text>{data.bank.bsb}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text>Account number</Text>
            <Text>{data.bank.accountNumber}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text>SWIFT Code</Text>
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
      <View style={styles.twoCol}>
        <View>
          <View style={styles.keyValRow}>
            <Text>Student ID</Text>
            <Text>{data.student.studentId}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text>First Name</Text>
            <Text>{data.student.firstName}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text>Surname</Text>
            <Text>{data.student.surname}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text>Date of Birth</Text>
            <Text>{data.student.dateOfBirth}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text>Nationality</Text>
            <Text>{data.student.nationality}</Text>
          </View>
        </View>
        <View>
          <View style={styles.keyValRow}>
            <Text>Gender</Text>
            <Text>{data.student.gender}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text>Passport No</Text>
            <Text>{data.student.passportNo}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text>Phone</Text>
            <Text>{data.student.phone}</Text>
          </View>
          <View style={styles.keyValRow}>
            <Text>Email</Text>
            <Text>{data.student.email}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Course Details</Text>
      <View style={{ marginTop: 6 }}>
        <View style={styles.keyValRow}>
          <Text>Proposal #</Text>
          <Text>{data.course.proposalNo}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text>CRICOS Course Code</Text>
          <Text>{data.course.cricosCourseCode}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text>Course Code</Text>
          <Text>{data.course.courseCode}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text>Course Name</Text>
          <Text>{data.course.courseName}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text>Start Date</Text>
          <Text>{data.course.startDate}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text>End Date</Text>
          <Text>{data.course.endDate}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text>Location</Text>
          <Text>{data.course.location}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text>Hrs/Week</Text>
          <Text>{data.course.hoursPerWeek}</Text>
        </View>
        <View style={styles.keyValRow}>
          <Text>Total Duration Weeks</Text>
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
      <View style={{ marginTop: 10 }}>
        <Text>Course Locations:</Text>
        {data.course.locationsList.map((line, idx) => (
          <Text key={idx}>- {line}</Text>
        ))}
      </View>
      <View style={{ marginTop: 10 }}>
        <Text style={styles.small}>
          NOTE: YOU MUST ADVISE THE COLLEGE OF ANY CHANGE IN ADDRESS WHILE
          ENROLLED IN THE COURSE
        </Text>
      </View>
      <View style={{ marginTop: 10 }}>
        <Text>Condition(s) of the Offer:</Text>
        {(data.conditionsOfOffer ?? []).map((c, i) => (
          <Text key={i}>- {c}</Text>
        ))}
      </View>
      <Footer data={data} pageNum={3} total={12} />
    </Page>

    {/* Page 4 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={4} total={12} />
      <View>
        <View style={styles.keyValRow}>
          <Text>Hours per week</Text>
          <Text>{data.hoursPerWeekClause}</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text>Entry Requirement</Text>
          <Text style={{ marginTop: 4 }}>{data.entryRequirementText}</Text>
        </View>
        <View style={{ marginTop: 10 }}>
          <Text>Payment of Fees:</Text>
          <Text style={{ marginTop: 4 }}>
            Payment must include the following: All fees are in Australian
            dollars (AUD)
          </Text>
        </View>
        <View style={{ marginTop: 12 }}>
          <Text>Payment Plans</Text>
          <Text>
            Course Name: {data.course.courseCode} {data.course.courseName}
          </Text>
          <Text>Enrol ID {data.paymentPlan.enrolId}</Text>
        </View>
      </View>
      <Footer data={data} pageNum={4} total={12} />
    </Page>

    {/* Page 5 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={5} total={12} />
      <View style={styles.table}>
        <View style={styles.thead}>
          <Text style={[styles.cell, { fontWeight: 700 }, styles.col_date]}>
            Due Date
          </Text>
          <Text style={[styles.cell, { fontWeight: 700 }, styles.col_feeType]}>
            Fees
          </Text>
          <Text style={[styles.cell, { fontWeight: 700 }, styles.col_amount]}>
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
      <Footer data={data} pageNum={5} total={12} />
    </Page>

    {/* Page 6 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={6} total={12} />
      <Text style={styles.sectionTitle}>International Student Agreement</Text>
      <Text style={{ marginTop: 8 }}>Information and terms and conditions</Text>
      <Text style={styles.sectionTitle}>Fees and Refunds</Text>
      <Paragraphs lines={data.refundsBlocks.intro} />
      <Text style={styles.paragraph}>
        {data.refundsBlocks.additionalFeesNotice}
      </Text>
      <Footer data={data} pageNum={6} total={12} />
    </Page>

    {/* Page 7 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={7} total={12} />
      <Text style={styles.sectionTitle}>Additional fees that may apply</Text>
      <View style={styles.table}>
        <View style={styles.thead}>
          <Text style={[styles.cell, { fontWeight: 700 }, styles.col_feeName]}>
            Additional fees that may apply
          </Text>
          <Text style={[styles.cell, { fontWeight: 700 }, styles.col_feeAmt]}>
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
      <Footer data={data} pageNum={7} total={12} />
    </Page>

    {/* Page 8 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={8} total={12} />
      <View style={styles.table}>
        <View style={styles.thead}>
          <Text style={[styles.cell, { fontWeight: 700 }, { width: '48%' }]}>
            Circumstance
          </Text>
          <Text style={[styles.cell, { fontWeight: 700 }, { width: '52%' }]}>
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

    {/* Page 9 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={9} total={12} />
      <Text style={styles.sectionTitle}>Complaints and Appeals</Text>
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
      <Footer data={data} pageNum={9} total={12} />
    </Page>

    {/* Page 10 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={10} total={12} />
      <Text>National Training Complaints Hotline</Text>
      <Paragraphs
        lines={[
          `Phone: ${data.complaintsAppeals.hotlinePhone}`,
          `Email: ${data.complaintsAppeals.hotlineEmail}`,
        ]}
      />
      <Text>Australian Skills Quality Authority (ASQA)</Text>
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
      <Text>Why we collect your personal information</Text>
      <Paragraphs lines={data.privacy.whyCollect} />
      <Text>How we use your personal information</Text>
      <Paragraphs lines={data.privacy.howUse} />
      <Footer data={data} pageNum={10} total={12} />
    </Page>

    {/* Page 11 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={11} total={12} />
      <Text>How we disclose your personal information</Text>
      <Paragraphs lines={data.privacy.howDisclose} />
      <Text>
        How the NCVER and other bodies handle your personal information
      </Text>
      <Paragraphs lines={data.privacy.ncverHandling} />
      <Text>{data.privacy.deseNote}</Text>
      <Link src={data.privacy.deseUrl} style={styles.inlineLink}>
        {data.privacy.deseUrl}
      </Link>
      <Text>Surveys</Text>
      <Text>{data.privacy.surveys}</Text>
      <Text>Contact information</Text>
      <Paragraphs lines={data.privacy.contactInfo} />
      <Text style={styles.sectionTitle}>
        Requirement to provide change of contact details
      </Text>
      <Paragraphs lines={[data.privacy.changeOfContactRequirement]} />
      <Footer data={data} pageNum={11} total={12} />
    </Page>

    {/* Page 12 */}
    <Page size="A4" style={styles.page}>
      <Header data={data} pageNum={12} total={12} />
      <Text style={styles.sectionTitle}>Student Declaration</Text>
      <Paragraphs lines={data.studentDeclaration.paragraphs} />
      <Paragraphs lines={[data.studentDeclaration.websiteMention]} />
      <View style={{ marginTop: 14 }}>
        <View style={{ marginTop: 6 }}>
          <Text>Student name</Text>
          <Text style={{ marginTop: 2 }}>
            {data.studentDeclaration.namePlaceholder}
          </Text>
        </View>
        <View style={{ marginTop: 10 }}>
          <Text>Signature</Text>
          <Text style={{ marginTop: 20 }}> </Text>
        </View>
        <View style={{ marginTop: 10 }}>
          <Text>Date</Text>
          <Text style={{ marginTop: 20 }}> </Text>
        </View>
      </View>
      <Footer data={data} pageNum={12} total={12} />
    </Page>
  </Document>
);
