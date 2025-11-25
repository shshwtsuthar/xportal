import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

// Define the shape of the data prop
export type InvoicePdfData = {
  rtoName: string;
  rtoAddress: string;
  rtoCode: string;
  cricosCode: string;
  rtoEmail: string;
  rtoPhone: string;
  rtoLogoUrl?: string | null;
  studentName: string;
  studentAddress?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  orderNo: string;
  datePaid: string;
  lines: Array<{ description: string; amountCents: number }>;
  totalAmountCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
  gstCents: number;
  bankDetails: {
    bankName: string;
    accountName: string;
    bsb: string;
    accountNo: string;
  };
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333',
    lineHeight: 1.4,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  headerLeft: {
    width: '45%',
  },
  headerRight: {
    width: '50%',
    textAlign: 'right',
  },
  logo: {
    width: 150,
    height: 60,
    marginBottom: 10,
    objectFit: 'contain',
  },
  rtoMetaText: {
    fontSize: 9,
    marginBottom: 2,
    color: '#000',
  },

  // Invoice Info Grid
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  metaLeft: {
    width: '55%',
  },
  metaRight: {
    width: '35%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
  },
  headingTitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  recipientLabel: {
    fontSize: 9,
    marginBottom: 4,
  },
  recipientAddress: {
    fontSize: 10,
    color: '#555',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaLabel: {
    color: '#6b7280',
    fontSize: 9,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
  },

  // Table
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 8,
  },
  colDesc: { width: '60%', paddingRight: 10 },
  colAmount: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  headerText: { fontSize: 9, color: '#6b7280' },

  // Totals
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 30,
  },
  totalsBox: { width: '40%' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: { fontSize: 10 },
  totalValue: { fontSize: 10, textAlign: 'right' },
  balanceRow: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 4,
  },

  // Footer
  footer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
  },
  sectionTitle: { fontSize: 10, marginBottom: 8 },
  footerText: { fontSize: 9, marginBottom: 4, color: '#444' },
  bankDetailsBox: {
    marginTop: 10,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 4,
  },
  bankRow: { flexDirection: 'row', marginBottom: 2 },
  bankLabel: { width: 100, fontSize: 9, color: '#6b7280' },
  bankValue: { fontSize: 9, fontWeight: 'bold' },
});

const formatCurrency = (cents: number) => {
  return (cents / 100).toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
  });
};

export const InvoiceTemplate: React.FC<{ data: InvoicePdfData }> = ({
  data,
}) => (
  <Document title={`Invoice ${data.invoiceNumber}`}>
    <Page size="A4" style={styles.page}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {data.rtoLogoUrl && (
            <Image src={data.rtoLogoUrl} style={styles.logo} />
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.rtoMetaText}>{data.rtoAddress}</Text>
          <Text style={styles.rtoMetaText}>RTO Code: {data.rtoCode}</Text>
          <Text style={styles.rtoMetaText}>CRICOS Code: {data.cricosCode}</Text>
          <Text style={styles.rtoMetaText}>{data.rtoEmail}</Text>
          <Text style={styles.rtoMetaText}>{data.rtoPhone}</Text>
        </View>
      </View>

      {/* INVOICE META */}
      <View style={styles.metaContainer}>
        <View style={styles.metaLeft}>
          <Text style={styles.headingTitle}>Tax Invoice</Text>
          <Text style={styles.recipientLabel}>Recipient</Text>
          <Text style={{ fontSize: 10, marginBottom: 2 }}>
            {data.studentName}
          </Text>
          <Text style={styles.recipientAddress}>{data.studentAddress}</Text>
          <Text style={styles.recipientAddress}>AUSTRALIA</Text>
        </View>

        <View style={styles.metaRight}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Due Date:</Text>
            <Text style={styles.metaValue}>{data.dueDate}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Invoice No:</Text>
            <Text style={styles.metaValue}>{data.invoiceNumber}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Invoice Date:</Text>
            <Text style={styles.metaValue}>{data.issueDate}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Order No:</Text>
            <Text style={styles.metaValue}>{data.orderNo}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date Paid:</Text>
            <Text style={styles.metaValue}>{data.datePaid}</Text>
          </View>
        </View>
      </View>

      {/* TABLE */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.colDesc, styles.headerText]}>Description</Text>
          <Text style={[styles.colAmount, styles.headerText]}>
            Amount (Ex GST)
          </Text>
          <Text style={[styles.colTotal, styles.headerText]}>Total Amount</Text>
        </View>
        {data.lines.map((line, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDesc}>{line.description}</Text>
            <Text style={styles.colAmount}>
              {formatCurrency(line.amountCents)}
            </Text>
            <Text style={styles.colTotal}>
              {formatCurrency(line.amountCents)}
            </Text>
          </View>
        ))}
      </View>

      {/* TOTALS */}
      <View style={styles.totalsContainer}>
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.gstCents)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.totalAmountCents)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount Paid</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.amountPaidCents)}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.balanceRow]}>
            <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>
              Balance Due
            </Text>
            <Text style={[styles.totalValue, { fontWeight: 'bold' }]}>
              {formatCurrency(data.balanceDueCents)}
            </Text>
          </View>
        </View>
      </View>

      {/* FOOTER & BANK */}
      <View style={styles.footer}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <Text style={styles.footerText}>
          This invoice is also a receipt when paid in full. Payment terms are
          strictly 7 days from the invoice date.
        </Text>
        <Text style={[styles.footerText, { marginBottom: 10 }]}>
          Please note: credit cards attract up to 2% surcharge.
        </Text>

        <Text style={styles.footerText}>
          1. Secure online payment via Credit Card
        </Text>
        <Text style={styles.footerText}>
          2. Direct Debit to the following Account:
        </Text>

        <View style={styles.bankDetailsBox}>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Bank Name</Text>
            <Text style={styles.bankValue}>{data.bankDetails.bankName}</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Account Name</Text>
            <Text style={styles.bankValue}>{data.bankDetails.accountName}</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>BSB</Text>
            <Text style={styles.bankValue}>{data.bankDetails.bsb}</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Account No</Text>
            <Text style={styles.bankValue}>{data.bankDetails.accountNo}</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);
