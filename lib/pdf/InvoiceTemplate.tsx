import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export type InvoicePdfData = {
  rtoName: string;
  rtoAddress?: string;
  studentName: string;
  studentEmail?: string | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amountDueCents: number;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 42,
    fontSize: 11,
  },
  h1: { fontSize: 18, marginBottom: 8 },
  row: { marginTop: 6 },
  label: { fontSize: 10, color: '#6b7280' },
  val: { fontSize: 11 },
  right: { textAlign: 'right' },
  table: { marginTop: 16, borderTopWidth: 1, borderColor: '#e5e7eb' },
});

const formatCurrencyAud = (cents: number): string => {
  const n = (cents ?? 0) / 100;
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
};

export const InvoiceTemplate: React.FC<{ data: InvoicePdfData }> = ({
  data,
}) => (
  <Document title={`Invoice ${data.invoiceNumber}`}>
    <Page size="A4" style={styles.page}>
      <View>
        <Text style={styles.h1}>Tax Invoice</Text>
        <Text>{data.rtoName}</Text>
        {data.rtoAddress ? <Text>{data.rtoAddress}</Text> : null}
      </View>

      <View style={styles.row}>
        <Text>
          <Text style={styles.label}>Invoice # </Text>
          <Text style={styles.val}>{data.invoiceNumber}</Text>
        </Text>
      </View>
      <View style={styles.row}>
        <Text>
          <Text style={styles.label}>Issue Date </Text>
          <Text style={styles.val}>{data.issueDate}</Text>
        </Text>
      </View>
      <View style={styles.row}>
        <Text>
          <Text style={styles.label}>Due Date </Text>
          <Text style={styles.val}>{data.dueDate}</Text>
        </Text>
      </View>

      <View style={{ marginTop: 16 }}>
        <Text>Bill To</Text>
        <Text>{data.studentName}</Text>
        {data.studentEmail ? <Text>{data.studentEmail}</Text> : null}
      </View>

      <View style={styles.table}>
        <Text>Amount Due: {formatCurrencyAud(data.amountDueCents)}</Text>
      </View>
    </Page>
  </Document>
);
