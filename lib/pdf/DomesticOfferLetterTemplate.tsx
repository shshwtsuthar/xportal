import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
} from '@react-pdf/renderer';
import type { OfferLetterData } from './OfferLetterTemplate';

// --- STYLES & CONFIG ---

const COLORS = {
  text: '#374151',
  primary: '#7d191e',
  border: '#E5E7EB',
  zebra: '#F9FAFB',
  white: '#FFFFFF',
};

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
  docMeta: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 12,
    color: COLORS.white,
    backgroundColor: '#2e3a59',
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
  table: {
    width: '100%',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 24,
    alignItems: 'center',
  },
  tableHeaderRow: {
    backgroundColor: COLORS.zebra,
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
  col1: { width: '30%' },
  col2: { width: '70%' },
  colDate: { width: '15%' },
  colFee: { width: '60%' },
  colAmt: { width: '25%', textAlign: 'right' },
  colRefund1: { width: '45%' },
  colRefund2: { width: '55%' },
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
  footerMeta: {
    fontSize: 8,
    color: '#6B7280',
  },
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

export const DomesticOfferLetterTemplate: React.FC<{
  data: OfferLetterData;
}> = ({ data }) => {
  // Base pages: 1-Intro, 2-Acceptance, 3-Student/Course, 4-Payment, 5-Terms, 6-Additional Fees, 7-Refund, 8-Complaints, 9-Complaints Links, 10-Privacy, 11-Declaration
  // VSL adds 1 page after payment (becomes page 5, others shift)
  const hasVSL = data.vetStudentLoansEligible && data.vetStudentLoansInfo;
  const totalPages = 11 + (hasVSL ? 1 : 0);

  return (
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
            {data.offer.agency !== 'N/A' && (
              <Text style={{ marginTop: 5, color: '#666' }}>
                Agency: {data.offer.agency}
              </Text>
            )}
          </View>

          <Text style={{ marginTop: 20 }}>Dear {data.offer.greetingName},</Text>

          <View style={{ marginTop: 10 }}>
            <Text style={styles.paragraph}>
              We are delighted to inform you that your application to enroll
              with us has been accepted.
            </Text>
            <Text style={styles.paragraph}>
              Please carefully check all the details of your enrolment and the
              terms and conditions. If there is any changes to be made to your
              details or any information that you are unsure about, please
              contact us.
            </Text>
            <Text style={styles.paragraph}>
              Once you are satisfied that all of the information is correct and
              you understand and agree the terms and conditions, please complete
              the declaration at the end and return it to us.
            </Text>
            <Text style={styles.paragraph}>
              Once we receive your declaration, we will send you a tax invoice
              which you should pay immediately to secure your place. Upon
              completion of all of the above, your Confirmation of Enrolment
              will be sent to you.
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
        <Footer data={data} pageNum={1} total={totalPages} />
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
              • Ensure your Unique Student Identifier (USI) is correctly
              recorded. If you do not have a USI, you must create one at
              usi.gov.au or we can assist you in creating one.
            </Text>
            <Text style={styles.listItem}>
              • Carefully read all of the information in this Student Agreement.
              If there is anything that you do not understand, please contact
              us.
            </Text>
            <Text style={styles.listItem}>
              • Sign and date this agreement and return it to us once you are
              satisfied that all details are correct and that you understand the
              terms and conditions.
            </Text>
            <Text style={styles.listItem}>
              • You should also keep a copy of this agreement for your records
              as stated under the Student Declaration.
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
          <View style={{ flexDirection: 'row' }}>
            <Text style={[styles.bold, { width: 120 }]}>Account Number:</Text>
            <Text>{data.bank.accountNumber}</Text>
          </View>
        </View>
        <Footer data={data} pageNum={2} total={totalPages} />
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
          * carefully check all of the details below to make sure they are
          correct
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
          {data.student.usi && (
            <View style={styles.tableRow}>
              <Text
                style={[
                  styles.tableCell,
                  styles.bold,
                  styles.col1,
                  { backgroundColor: COLORS.zebra },
                ]}
              >
                USI
              </Text>
              <Text style={[styles.tableCell, styles.col2]}>
                {data.student.usi}
              </Text>
            </View>
          )}
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
          <View style={styles.tableHeaderRow}>
            <Text
              style={[
                styles.tableCell,
                styles.tableCellHeader,
                { width: '15%' },
              ]}
            >
              Prop #
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableCellHeader,
                { width: '40%' },
              ]}
            >
              Course Code
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableCellHeader,
                { width: '45%' },
              ]}
            >
              Course Name
            </Text>
          </View>
          <View style={styles.tableHeaderRow}>
            <Text
              style={[
                styles.tableCell,
                styles.tableCellHeader,
                { width: '15%' },
              ]}
            >
              Dates
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableCellHeader,
                { width: '40%' },
              ]}
            >
              Duration
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableCellHeader,
                { width: '45%' },
              ]}
            >
              Location
            </Text>
          </View>
          <View
            style={[
              styles.tableRow,
              { borderBottomWidth: 0, alignItems: 'flex-start' },
            ]}
          >
            <Text style={[styles.tableCell, { width: '15%' }]}>
              {data.course.proposalNo}
            </Text>
            <Text style={[styles.tableCell, { width: '40%' }]}>
              {data.course.courseCode}
            </Text>
            <Text style={[styles.tableCell, { width: '45%' }]}>
              {data.course.courseName}
            </Text>
          </View>
          <View
            style={[
              styles.tableRow,
              { borderBottomWidth: 0, alignItems: 'flex-start' },
            ]}
          >
            <Text style={[styles.tableCell, { width: '15%' }]}>
              {data.course.startDate}
              {'\n'}to{'\n'}
              {data.course.endDate}
            </Text>
            <Text style={[styles.tableCell, { width: '40%' }]}>
              {data.course.totalWeeks} Wks{'\n'}({data.course.hoursPerWeek}
              hrs/wk)
            </Text>
            <Text style={[styles.tableCell, { width: '45%' }]}>
              {data.course.location}
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

        <Footer data={data} pageNum={3} total={totalPages} />
      </Page>

      {/* PAGE 4: Payment Plan */}
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

        {data.governmentFunding && (
          <View
            style={{
              marginBottom: 15,
              padding: 10,
              backgroundColor: '#E0F2FE',
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <Text style={[styles.bold, { marginBottom: 5 }]}>
              Government Funding Information
            </Text>
            <Text style={{ fontSize: 9 }}>
              This course may be eligible for {data.governmentFunding.program}{' '}
              funding in {data.governmentFunding.state}. Please contact us for
              more information about eligibility and funding arrangements.
            </Text>
          </View>
        )}

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
              <Text style={[styles.tableCell, styles.colFee]}>
                {row.feeType}
              </Text>
              <Text style={[styles.tableCell, styles.colAmt]}>
                {row.amount}
              </Text>
            </View>
          ))}
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

        <Footer data={data} pageNum={4} total={totalPages} />
      </Page>

      {/* VET Student Loans Page (if eligible) */}
      {data.vetStudentLoansEligible && data.vetStudentLoansInfo && (
        <Page size="A4" style={styles.page}>
          <Header data={data} />
          <Text style={styles.sectionTitle}>VET Student Loans</Text>

          <Text style={styles.subHeader}>Eligibility</Text>
          {data.vetStudentLoansInfo.eligibility.map((line, i) => (
            <Text key={i} style={styles.paragraph}>
              {line}
            </Text>
          ))}

          <Text style={styles.subHeader}>Loan Caps</Text>
          {data.vetStudentLoansInfo.loanCaps.map((line, i) => (
            <Text key={i} style={styles.paragraph}>
              {line}
            </Text>
          ))}

          <Text style={styles.subHeader}>Repayment</Text>
          {data.vetStudentLoansInfo.repayment.map((line, i) => (
            <Text key={i} style={styles.paragraph}>
              {line}
            </Text>
          ))}

          <Footer data={data} pageNum={5} total={totalPages} />
        </Page>
      )}

      {/* PAGE 5/6: Terms Intro */}
      <Page size="A4" style={styles.page}>
        <Header data={data} />
        <Text style={styles.sectionTitle}>Student Written Agreement</Text>

        <Text style={styles.subHeader}>
          Information and terms and conditions
        </Text>
        <Text style={[styles.subHeader, { color: COLORS.text }]}>
          Fees and Refunds
        </Text>

        {data.coolingOffPeriodDays && (
          <View
            style={{
              marginBottom: 10,
              padding: 10,
              backgroundColor: '#FEF3C7',
              borderWidth: 1,
              borderColor: '#F59E0B',
            }}
          >
            <Text style={[styles.bold, { marginBottom: 5 }]}>
              Cooling-Off Period
            </Text>
            <Text style={{ fontSize: 9 }}>
              You have {data.coolingOffPeriodDays} days from the date you sign
              this agreement to withdraw and receive a full refund (less any
              non-refundable application fee). This is your right under
              Australian Consumer Law.
            </Text>
          </View>
        )}

        <Paragraphs lines={data.refundsBlocks.intro} />
        <Text
          style={[styles.paragraph, { marginTop: 10, fontStyle: 'italic' }]}
        >
          {data.refundsBlocks.additionalFeesNotice}
        </Text>

        <Footer data={data} pageNum={hasVSL ? 6 : 5} total={totalPages} />
      </Page>

      {/* PAGE 6/7: Additional Fees */}
      <Page size="A4" style={styles.page}>
        <Header data={data} />
        <Text style={styles.sectionTitle}>Additional Fees</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text
              style={[
                styles.tableCell,
                styles.tableCellHeader,
                { width: '70%' },
              ]}
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
        <Footer data={data} pageNum={hasVSL ? 7 : 6} total={totalPages} />
      </Page>

      {/* PAGE 7/8: REFUND TABLE */}
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
        <Footer data={data} pageNum={hasVSL ? 8 : 7} total={totalPages} />
      </Page>

      {/* PAGE 8/9: Complaints */}
      <Page size="A4" style={styles.page}>
        <Header data={data} />
        <Text style={styles.sectionTitle}>Complaints and Appeals</Text>
        <Paragraphs lines={data.complaintsAppeals.paragraphs.slice(0, 8)} />
        <Footer data={data} pageNum={hasVSL ? 9 : 8} total={totalPages} />
      </Page>

      {/* PAGE 9/10: Complaints Continued + Links */}
      <Page size="A4" style={styles.page}>
        <Header data={data} />
        <Text style={styles.subHeader}>External Appeals</Text>
        <Paragraphs
          lines={[
            data.complaintsAppeals.stateOmbudsmanName
              ? `Domestic students may complain to the ${data.complaintsAppeals.stateOmbudsmanName} or Consumer Affairs about:`
              : 'Domestic students may complain to the State Ombudsman or Consumer Affairs about:',
          ]}
        />
        {data.complaintsAppeals.bulletsDomesticStudents?.map((b, i) => (
          <Text key={i} style={styles.listItem}>
            • {b}
          </Text>
        ))}

        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Useful Contacts</Text>
          {data.complaintsAppeals.stateOmbudsmanName &&
            data.complaintsAppeals.stateOmbudsmanUrl && (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.bold}>
                  {data.complaintsAppeals.stateOmbudsmanName}:
                </Text>
                <Link
                  src={data.complaintsAppeals.stateOmbudsmanUrl}
                  style={{ color: COLORS.primary, fontSize: 9 }}
                >
                  {data.complaintsAppeals.stateOmbudsmanUrl}
                </Link>
              </View>
            )}
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.bold}>
              National Training Complaints Hotline:
            </Text>
            <Text style={{ fontSize: 9 }}>
              Phone: {data.complaintsAppeals.hotlinePhone}
            </Text>
            <Text style={{ fontSize: 9 }}>
              Email: {data.complaintsAppeals.hotlineEmail}
            </Text>
          </View>
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.bold}>Consumer Affairs:</Text>
            <Text style={{ fontSize: 9 }}>
              Visit your state or territory Consumer Affairs website for
              information about consumer rights and protections.
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
        <Footer data={data} pageNum={hasVSL ? 10 : 9} total={totalPages} />
      </Page>

      {/* PAGE 10/11: Privacy */}
      <Page size="A4" style={styles.page}>
        <Header data={data} />
        <Text style={styles.sectionTitle}>Privacy Notice</Text>
        <Text style={styles.subHeader}>
          Why we collect your personal information
        </Text>
        <Paragraphs lines={data.privacy.whyCollect} />

        <Text style={styles.subHeader}>
          How we use your personal information
        </Text>
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

        <Footer data={data} pageNum={hasVSL ? 11 : 10} total={totalPages} />
      </Page>

      {/* PAGE 11/12: Declaration */}
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

        <Footer data={data} pageNum={hasVSL ? 12 : 11} total={totalPages} />
      </Page>
    </Document>
  );
};
