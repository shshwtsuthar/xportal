import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
  Font,
} from '@react-pdf/renderer';

// --- TYPES (Matching the Data Builder) ---
export type OfferLetterData = {
  isInternational: boolean;
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
    usi?: string;
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
    bulletsInternationalStudents?: string[];
    bulletsDomesticStudents?: string[];
    ombudsmanUrl?: string;
    stateOmbudsmanUrl?: string;
    stateOmbudsmanName?: string;
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
  vetStudentLoansEligible?: boolean;
  vetStudentLoansInfo?: {
    eligibility: string[];
    loanCaps: string[];
    repayment: string[];
  };
  governmentFunding?: {
    program: string;
    state: string;
  } | null;
  coolingOffPeriodDays?: number;
};

// --- STYLES & CONFIG ---

const COLORS = {
  text: '#374151', // Soft black
  primary: '#7d191e', // Ashford Red
  border: '#E5E7EB', // Light Gray
  zebra: '#F9FAFB', // Very Light Gray
  white: '#FFFFFF',
};

// Optional: Register a cleaner font if available (using Helvetica default here)
const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 45,
    color: COLORS.text,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
  },
  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: {
    width: 140,
    height: 50,
    objectFit: 'contain',
  },
  headerTextContainer: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 9,
    color: COLORS.text,
    textAlign: 'right',
  },
  // DOCUMENT STRIP (Red bar at bottom or meta info)
  docMeta: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
  },
  // TITLES
  sectionTitle: {
    fontSize: 12,
    color: COLORS.white,
    backgroundColor: '#2e3a59', // Dark Navy background for headers looks premium
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 15,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subHeader: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
  },
  // TEXT
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  listItem: {
    marginLeft: 15,
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
    color: '#111827',
  },
  // TABLES
  table: {
    width: '100%',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.primary, // Red border for table container
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 24,
    alignItems: 'center',
  },
  tableHeaderRow: {
    backgroundColor: COLORS.zebra, // Light gray header
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  tableCell: {
    padding: 6,
    fontSize: 9,
  },
  tableCellHeader: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  // Column Widths
  col1: { width: '30%' },
  col2: { width: '70%' },
  colDate: { width: '15%' },
  colFee: { width: '60%' },
  colAmt: { width: '25%', textAlign: 'right' },
  colRefund1: { width: '45%' },
  colRefund2: { width: '55%' },

  // FOOTER
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 45,
    right: 45,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: COLORS.white,
    backgroundColor: COLORS.primary,
    padding: 4,
  },
  footerMeta: {
    fontSize: 8,
    color: '#6B7280',
  },

  // SIGNATURE BOX
  declBox: {
    borderWidth: 1,
    borderColor: '#000',
    marginTop: 20,
  },
  declRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 35,
  },
  declLabel: {
    width: '30%',
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRightWidth: 1,
    borderRightColor: '#000',
    fontWeight: 'bold',
  },
  declValue: {
    width: '70%',
    padding: 8,
  },
});

// --- HELPER COMPONENTS ---

const Paragraphs = ({ lines }: { lines: string[] }) => (
  <>
    {lines.map((t, i) => (
      <Text key={i} style={styles.paragraph}>
        {t}
      </Text>
    ))}
  </>
);

const Header = ({ data }: { data: OfferLetterData }) => (
  <View style={styles.header}>
    <View>
      {data.institution.logoSrc && (
        <Image style={styles.logo} src={data.institution.logoSrc} />
      )}
    </View>
    <View style={styles.headerTextContainer}>
      <Text style={styles.headerTitle}>{data.institution.name}</Text>
      <Text style={styles.headerSub}>{data.institution.addressLine}</Text>
      <Text style={styles.headerSub}>
        E: {data.institution.email} | T: {data.institution.phone}
      </Text>
      <Text style={styles.headerSub}>W: {data.institution.website}</Text>
      <Text style={[styles.docMeta, { color: COLORS.primary }]}>
        {data.document.docTitle}
      </Text>
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
    <View style={{ width: '100%' }}>
      {/* Red strip with Codes */}
      <View
        style={{ backgroundColor: COLORS.primary, padding: 4, marginBottom: 2 }}
      >
        <Text style={{ fontSize: 9, color: 'white', textAlign: 'left' }}>
          {data.metaFooter.leftCode}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.footerMeta}>{data.document.versionLine}</Text>
        <Text style={styles.footerMeta}>
          Page {pageNum} of {total}
        </Text>
      </View>
    </View>
  </View>
);

// --- MAIN DOCUMENT ---

export const OfferLetterTemplate: React.FC<{ data: OfferLetterData }> = ({
  data,
}) => (
  <Document title="Offer Letter">
    {/* PAGE 1: Intro */}
    <Page size="A4" style={styles.page}>
      <Header data={data} />

      <View style={{ marginTop: 20 }}>
        <Text style={styles.sectionTitle}>{data.document.docTitle}</Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 10,
          }}
        >
          <View>
            <Text>
              <Text style={styles.bold}>Offer Letter ID:</Text>{' '}
              {data.offer.offerLetterId}
            </Text>
            <Text style={{ marginTop: 4 }}>
              <Text style={styles.bold}>Date:</Text> {data.offer.date}
            </Text>
          </View>
        </View>

        <View
          style={{
            marginTop: 20,
            borderLeftWidth: 4,
            borderLeftColor: COLORS.primary,
            paddingLeft: 10,
          }}
        >
          <Text style={styles.bold}>{data.offer.addresseeLine1}</Text>
          <Text>{data.offer.addresseeLine2}</Text>
          <Text style={{ marginTop: 5, color: '#666' }}>
            Agency: {data.offer.agency}
          </Text>
        </View>

        <Text style={{ marginTop: 20 }}>Dear {data.offer.greetingName},</Text>

        <View style={{ marginTop: 10 }}>
          <Text style={styles.paragraph}>
            We are delighted to inform you that your application to enroll with
            us has been accepted.
          </Text>
          <Text style={styles.paragraph}>
            Please carefully check all the details of your enrolment and the
            terms and conditions. If there is any changes to be made to your
            details or any information that you are unsure about, please contact
            us.
          </Text>
          <Text style={styles.paragraph}>
            Once you are satisfied that all of the information is correct and
            you understand and agree the terms and conditions, please complete
            the declaration at the end and return it to us.
          </Text>
          <Text style={styles.paragraph}>
            Once we receive your declaration, we will send you a tax invoice
            which you should pay immediately to secure your place. Upon
            completion of all of the above, your Electronic Confirmation of
            Enrolment will be sent to you.
          </Text>
          <Text style={styles.paragraph}>
            We look forward to welcoming you.
          </Text>
        </View>

        <View style={{ marginTop: 30 }}>
          <Text style={styles.bold}>Kind regards,</Text>
          <Text>Administration Team</Text>
          <Text style={{ marginTop: 5 }}>E: {data.institution.email}</Text>
          <Text>P: {data.institution.phone}</Text>
        </View>
      </View>
      <Footer data={data} pageNum={1} total={12} />
    </Page>

    {/* PAGE 2: Acceptance & Bank */}
    <Page size="A4" style={styles.page}>
      <Header data={data} />
      <Text style={styles.sectionTitle}>Accepting this offer</Text>

      <View style={{ marginTop: 10 }}>
        <Text style={styles.paragraph}>
          To confirm your enrolment into this course you are required to:
        </Text>
        <View style={{ paddingLeft: 10 }}>
          <Text style={styles.listItem}>
            • Check all your personal details to ensure they are correct.
          </Text>
          <Text style={styles.listItem}>
            • Carefully read all of the information in this Student Agreement.
            If there is anything that you do not understand, please contact us.
          </Text>
          <Text style={styles.listItem}>
            • Sign and date this agreement and return it to us once you are
            satisfied that all details are correct and that you understand the
            terms and conditions.
          </Text>
          <Text style={styles.listItem}>
            • You should also keep a copy of this agreement for your records as
            stated under the Student Declaration.
          </Text>
        </View>
        <Text style={[styles.paragraph, { marginTop: 10 }]}>
          Once we receive your signed agreement and payment you will be
          forwarded your Confirmation of Enrolment.
        </Text>
      </View>

      <Text style={styles.subHeader}>
        All payments are to be made into the following account:
      </Text>
      <View
        style={{
          marginTop: 5,
          padding: 15,
          backgroundColor: '#F3F4F6',
          borderRadius: 4,
        }}
      >
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={[styles.bold, { width: 120 }]}>Account Name:</Text>
          <Text>{data.bank.accountName}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={[styles.bold, { width: 120 }]}>Bank:</Text>
          <Text>{data.bank.bank}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={[styles.bold, { width: 120 }]}>BSB:</Text>
          <Text>{data.bank.bsb}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={[styles.bold, { width: 120 }]}>Account Number:</Text>
          <Text>{data.bank.accountNumber}</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Text style={[styles.bold, { width: 120 }]}>SWIFT Code:</Text>
          <Text>{data.bank.swiftCode}</Text>
        </View>
      </View>
      <Footer data={data} pageNum={2} total={12} />
    </Page>

    {/* PAGE 3: Student & Course Details */}
    <Page size="A4" style={styles.page}>
      <Header data={data} />
      <Text
        style={{
          fontSize: 9,
          color: 'red',
          textAlign: 'center',
          marginBottom: 5,
        }}
      >
        * carefully check all of the details below to make sure they are correct
      </Text>

      <Text style={styles.sectionTitle}>Student Details</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text
            style={[
              styles.tableCell,
              styles.bold,
              styles.col1,
              { backgroundColor: COLORS.zebra },
            ]}
          >
            Student ID
          </Text>
          <Text style={[styles.tableCell, styles.col2]}>
            {data.student.studentId}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text
            style={[
              styles.tableCell,
              styles.bold,
              styles.col1,
              { backgroundColor: COLORS.zebra },
            ]}
          >
            First Name
          </Text>
          <Text style={[styles.tableCell, styles.col2]}>
            {data.student.firstName}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text
            style={[
              styles.tableCell,
              styles.bold,
              styles.col1,
              { backgroundColor: COLORS.zebra },
            ]}
          >
            Surname
          </Text>
          <Text style={[styles.tableCell, styles.col2]}>
            {data.student.surname}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text
            style={[
              styles.tableCell,
              styles.bold,
              styles.col1,
              { backgroundColor: COLORS.zebra },
            ]}
          >
            Date of Birth
          </Text>
          <Text style={[styles.tableCell, styles.col2]}>
            {data.student.dateOfBirth}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text
            style={[
              styles.tableCell,
              styles.bold,
              styles.col1,
              { backgroundColor: COLORS.zebra },
            ]}
          >
            Nationality
          </Text>
          <Text style={[styles.tableCell, styles.col2]}>
            {data.student.nationality}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text
            style={[
              styles.tableCell,
              styles.bold,
              styles.col1,
              { backgroundColor: COLORS.zebra },
            ]}
          >
            Gender
          </Text>
          <Text style={[styles.tableCell, styles.col2]}>
            {data.student.gender}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text
            style={[
              styles.tableCell,
              styles.bold,
              styles.col1,
              { backgroundColor: COLORS.zebra },
            ]}
          >
            Passport No
          </Text>
          <Text style={[styles.tableCell, styles.col2]}>
            {data.student.passportNo}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text
            style={[
              styles.tableCell,
              styles.bold,
              styles.col1,
              { backgroundColor: COLORS.zebra },
            ]}
          >
            Phone
          </Text>
          <Text style={[styles.tableCell, styles.col2]}>
            {data.student.phone}
          </Text>
        </View>
        <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
          <Text
            style={[
              styles.tableCell,
              styles.bold,
              styles.col1,
              { backgroundColor: COLORS.zebra },
            ]}
          >
            Email
          </Text>
          <Text style={[styles.tableCell, styles.col2]}>
            {data.student.email}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Course Details</Text>
      <View style={styles.table}>
        {/* Headers */}
        <View style={styles.tableHeaderRow}>
          <Text
            style={[styles.tableCell, styles.tableCellHeader, { width: '15%' }]}
          >
            Prop #
          </Text>
          <Text
            style={[styles.tableCell, styles.tableCellHeader, { width: '15%' }]}
          >
            CRICOS
          </Text>
          <Text
            style={[styles.tableCell, styles.tableCellHeader, { width: '40%' }]}
          >
            Course Name
          </Text>
          <Text
            style={[styles.tableCell, styles.tableCellHeader, { width: '15%' }]}
          >
            Dates
          </Text>
          <Text
            style={[styles.tableCell, styles.tableCellHeader, { width: '15%' }]}
          >
            Duration
          </Text>
        </View>
        {/* Row */}
        <View
          style={[
            styles.tableRow,
            { borderBottomWidth: 0, alignItems: 'flex-start' },
          ]}
        >
          <Text style={[styles.tableCell, { width: '15%' }]}>
            {data.course.proposalNo}
          </Text>
          <Text style={[styles.tableCell, { width: '15%' }]}>
            {data.course.cricosCourseCode}
            {'\n'}
            {data.course.courseCode}
          </Text>
          <Text style={[styles.tableCell, { width: '40%' }]}>
            {data.course.courseName}
          </Text>
          <Text style={[styles.tableCell, { width: '15%' }]}>
            {data.course.startDate}
            {'\n'}to{'\n'}
            {data.course.endDate}
          </Text>
          <Text style={[styles.tableCell, { width: '15%' }]}>
            {data.course.totalWeeks} Wks{'\n'}({data.course.hoursPerWeek}hrs/wk)
          </Text>
        </View>
      </View>

      <View style={{ marginVertical: 10 }}>
        <Text>
          <Text style={styles.bold}>Agreed Start Date:</Text>{' '}
          {data.course.agreedStartDate}
        </Text>
        <Text>
          <Text style={styles.bold}>Expected End Date:</Text>{' '}
          {data.course.expectedEndDate}
        </Text>
      </View>

      <Text style={styles.subHeader}>Course Locations:</Text>
      {data.course.locationsList.map((loc, i) => (
        <Text key={i} style={[styles.listItem, { fontSize: 9 }]}>
          • {loc}
        </Text>
      ))}

      <Text style={{ marginTop: 10, fontSize: 8, fontStyle: 'italic' }}>
        NOTE: YOU MUST ADVISE THE COLLEGE OF ANY CHANGE IN ADDRESS WHILE
        ENROLLED IN THE COURSE
      </Text>

      <Footer data={data} pageNum={3} total={12} />
    </Page>

    {/* PAGE 4 & 5: Payment Plan */}
    <Page size="A4" style={styles.page}>
      <Header data={data} />

      <View style={{ marginBottom: 15 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: '#F3F4F6',
            padding: 10,
          }}
        >
          <Text>
            <Text style={styles.bold}>Hours per week:</Text>{' '}
            {data.hoursPerWeekClause}
          </Text>
        </View>
        <Text style={{ marginTop: 10 }}>
          <Text style={styles.bold}>Entry Requirement:</Text>{' '}
          {data.entryRequirementText}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Payment of Fees</Text>
      <Text style={{ fontSize: 9, marginBottom: 5 }}>
        Payment must include the following: All fees are in Australian dollars
        (AUD)
      </Text>

      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text
            style={[styles.tableCell, styles.tableCellHeader, styles.colDate]}
          >
            Due Date
          </Text>
          <Text
            style={[styles.tableCell, styles.tableCellHeader, styles.colFee]}
          >
            Fee Description
          </Text>
          <Text
            style={[styles.tableCell, styles.tableCellHeader, styles.colAmt]}
          >
            Amount
          </Text>
        </View>
        {data.paymentPlan.rows.map((row, i) => (
          <View
            key={i}
            style={[
              styles.tableRow,
              { backgroundColor: i % 2 === 0 ? COLORS.white : COLORS.zebra },
            ]}
          >
            <Text style={[styles.tableCell, styles.colDate]}>{row.date}</Text>
            <Text style={[styles.tableCell, styles.colFee]}>{row.feeType}</Text>
            <Text style={[styles.tableCell, styles.colAmt]}>{row.amount}</Text>
          </View>
        ))}
        {/* Total Row */}
        <View
          style={[
            styles.tableRow,
            { borderBottomWidth: 0, backgroundColor: COLORS.primary },
          ]}
        >
          <Text
            style={[
              styles.tableCell,
              {
                color: 'white',
                flex: 1,
                textAlign: 'right',
                paddingRight: 10,
                fontWeight: 'bold',
              },
            ]}
          >
            Total Course Fees: {data.paymentPlan.totalCourseFees}
          </Text>
        </View>
      </View>

      <Footer data={data} pageNum={4} total={12} />
    </Page>

    {/* PAGE 6: Terms Intro */}
    <Page size="A4" style={styles.page}>
      <Header data={data} />
      <Text style={styles.sectionTitle}>International Student Agreement</Text>

      <Text style={styles.subHeader}>Information and terms and conditions</Text>
      <Text style={[styles.subHeader, { color: COLORS.text }]}>
        Fees and Refunds
      </Text>

      <Paragraphs lines={data.refundsBlocks.intro} />
      <Text style={[styles.paragraph, { marginTop: 10, fontStyle: 'italic' }]}>
        {data.refundsBlocks.additionalFeesNotice}
      </Text>

      <Footer data={data} pageNum={6} total={12} />
    </Page>

    {/* PAGE 7: Additional Fees */}
    <Page size="A4" style={styles.page}>
      <Header data={data} />
      <Text style={styles.sectionTitle}>Additional Fees</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text
            style={[styles.tableCell, styles.tableCellHeader, { width: '70%' }]}
          >
            Additional fees that may apply
          </Text>
          <Text
            style={[
              styles.tableCell,
              styles.tableCellHeader,
              { width: '30%', textAlign: 'right' },
            ]}
          >
            Amount
          </Text>
        </View>
        {data.additionalFees.map((f, i) => (
          <View
            key={i}
            style={[
              styles.tableRow,
              { backgroundColor: i % 2 === 0 ? COLORS.white : COLORS.zebra },
            ]}
          >
            <Text style={[styles.tableCell, { width: '70%' }]}>{f.name}</Text>
            <Text
              style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}
            >
              {f.amount}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 10, padding: 8, backgroundColor: '#FFF1F2' }}>
        <Text style={styles.bold}>Overdue Fees Policy:</Text>
        <Text style={{ fontSize: 9 }}>
          Where fees are overdue, we will issue warnings as follows:
        </Text>
        <Text style={{ fontSize: 9, marginLeft: 10 }}>
          1. First warning letter (5 days overdue)
        </Text>
        <Text style={{ fontSize: 9, marginLeft: 10 }}>
          2. Second warning letter (5 days after first)
        </Text>
        <Text style={{ fontSize: 9, marginLeft: 10 }}>
          3. Notice of intention to report (5 days after second)
        </Text>
        <Text style={{ fontSize: 9, fontWeight: 'bold', marginTop: 4 }}>
          *Following cancellation for non-payment, debt will be referred to
          collection. Initial deposit is $1500.
        </Text>
      </View>
      <Footer data={data} pageNum={7} total={12} />
    </Page>

    {/* PAGE 8: REFUND TABLE (COMPLIANCE FIX) */}
    <Page size="A4" style={styles.page}>
      <Header data={data} />
      <Text style={styles.sectionTitle}>Refund Policy Details</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text
            style={[
              styles.tableCell,
              styles.tableCellHeader,
              styles.colRefund1,
            ]}
          >
            Circumstance
          </Text>
          <Text
            style={[
              styles.tableCell,
              styles.tableCellHeader,
              styles.colRefund2,
            ]}
          >
            Refund Due
          </Text>
        </View>
        {data.refundsCircumstances.map((row, i) => (
          <View
            key={i}
            style={[
              styles.tableRow,
              { backgroundColor: i % 2 === 0 ? COLORS.white : COLORS.zebra },
            ]}
          >
            <Text style={[styles.tableCell, styles.colRefund1]}>
              {row.circumstance}
            </Text>
            <Text style={[styles.tableCell, styles.colRefund2]}>
              {row.refundDue}
            </Text>
          </View>
        ))}
      </View>
      <Footer data={data} pageNum={8} total={12} />
    </Page>

    {/* PAGE 9: Complaints */}
    <Page size="A4" style={styles.page}>
      <Header data={data} />
      <Text style={styles.sectionTitle}>Complaints and Appeals</Text>
      <Paragraphs lines={data.complaintsAppeals.paragraphs.slice(0, 8)} />
      <Footer data={data} pageNum={9} total={12} />
    </Page>

    {/* PAGE 10: Complaints Continued + Links */}
    <Page size="A4" style={styles.page}>
      <Header data={data} />
      <Text style={styles.subHeader}>External Appeals (OSO)</Text>
      <Paragraphs
        lines={['International students may complain to the OSO about:']}
      />
      {data.complaintsAppeals.bulletsInternationalStudents?.map((b, i) => (
        <Text key={i} style={styles.listItem}>
          • {b}
        </Text>
      ))}

      <View style={{ marginTop: 20 }}>
        <Text style={styles.sectionTitle}>Useful Contacts</Text>
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.bold}>Overseas Students Ombudsman:</Text>
          <Link
            src={data.complaintsAppeals.ombudsmanUrl}
            style={{ color: COLORS.primary, fontSize: 9 }}
          >
            {data.complaintsAppeals.ombudsmanUrl}
          </Link>
        </View>
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.bold}>National Training Complaints Hotline:</Text>
          <Text style={{ fontSize: 9 }}>
            Phone: {data.complaintsAppeals.hotlinePhone}
          </Text>
          <Text style={{ fontSize: 9 }}>
            Email: {data.complaintsAppeals.hotlineEmail}
          </Text>
        </View>
        <View>
          <Text style={styles.bold}>ASQA:</Text>
          <Link
            src={data.complaintsAppeals.asqaUrl}
            style={{ color: COLORS.primary, fontSize: 9 }}
          >
            {data.complaintsAppeals.asqaUrl}
          </Link>
        </View>
      </View>
      <Footer data={data} pageNum={10} total={12} />
    </Page>

    {/* PAGE 11: Privacy */}
    <Page size="A4" style={styles.page}>
      <Header data={data} />
      <Text style={styles.sectionTitle}>Privacy Notice</Text>
      <Text style={styles.subHeader}>
        Why we collect your personal information
      </Text>
      <Paragraphs lines={data.privacy.whyCollect} />

      <Text style={styles.subHeader}>How we use your personal information</Text>
      <Paragraphs lines={data.privacy.howUse} />

      <Text style={styles.subHeader}>
        How we disclose your personal information
      </Text>
      <Paragraphs lines={data.privacy.howDisclose} />

      <View
        style={{
          marginTop: 20,
          padding: 10,
          borderWidth: 1,
          borderColor: COLORS.primary,
          borderStyle: 'dashed',
        }}
      >
        <Text style={styles.bold}>
          Requirement to provide change of contact details
        </Text>
        <Text style={{ fontSize: 9, marginTop: 5 }}>
          {data.privacy.changeOfContactRequirement}
        </Text>
      </View>

      <Footer data={data} pageNum={11} total={12} />
    </Page>

    {/* PAGE 12: Declaration */}
    <Page size="A4" style={styles.page}>
      <Header data={data} />

      <View
        style={{ backgroundColor: COLORS.primary, padding: 8, marginTop: 20 }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
          Student Declaration
        </Text>
      </View>

      <View style={{ marginTop: 15 }}>
        <Paragraphs lines={data.studentDeclaration.paragraphs} />
      </View>

      {/* Signature Block */}
      <View style={styles.declBox}>
        <View style={styles.declRow}>
          <Text style={styles.declLabel}>Student Name</Text>
          <Text style={styles.declValue}>
            {data.studentDeclaration.namePlaceholder}
          </Text>
        </View>
        <View style={styles.declRow}>
          <Text style={styles.declLabel}>Signature</Text>
          <Text style={styles.declValue}> </Text>
        </View>
        <View style={[styles.declRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.declLabel}>Date</Text>
          <Text style={styles.declValue}> </Text>
        </View>
      </View>

      <Footer data={data} pageNum={12} total={12} />
    </Page>
  </Document>
);
