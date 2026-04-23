import "server-only";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerTitle: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  muted: { color: "#6b7280" },
  small: { fontSize: 9 },
  section: { marginBottom: 16 },
  sectionHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: 4,
  },
  twoCol: { flexDirection: "row", justifyContent: "space-between" },
  table: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 16,
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  trHead: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  cellDate: { width: "18%" },
  cellTopic: { width: "42%" },
  cellHours: { width: "12%", textAlign: "right" },
  cellRate: { width: "14%", textAlign: "right" },
  cellAmount: { width: "14%", textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  totalsLabel: { width: 80, textAlign: "right", marginRight: 8 },
  totalsValue: {
    width: 80,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    color: "#9ca3af",
    fontSize: 8,
    textAlign: "center",
  },
});

export type InvoicePdfLine = {
  start_time: string;
  topic: string;
  hours: number;
  rate: number;
  amount: number;
};

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  organizationName: string;
  studentName: string;
  studentEmail?: string | null;
  parentName?: string | null;
  parentEmail?: string | null;
  lines: InvoicePdfLine[];
  subtotal: number;
  amountDue: number;
  notes?: string | null;
};

function money(n: number) {
  return `$${n.toFixed(2)}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>INVOICE</Text>
            <Text style={styles.muted}>{data.organizationName}</Text>
          </View>
          <View>
            <Text style={styles.bold}>{data.invoiceNumber}</Text>
            <Text style={styles.small}>Issued: {fmtDate(data.issueDate)}</Text>
            {data.dueDate && (
              <Text style={styles.small}>Due: {fmtDate(data.dueDate)}</Text>
            )}
          </View>
        </View>

        <View style={[styles.section, styles.twoCol]}>
          <View>
            <Text style={styles.sectionHeading}>Bill To</Text>
            <Text style={styles.bold}>
              {data.parentName ?? data.studentName}
            </Text>
            {data.parentEmail && <Text>{data.parentEmail}</Text>}
            <Text style={styles.muted}>Student: {data.studentName}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.trHead}>
            <Text style={[styles.cellDate, styles.bold]}>Date</Text>
            <Text style={[styles.cellTopic, styles.bold]}>Topic</Text>
            <Text style={[styles.cellHours, styles.bold]}>Hours</Text>
            <Text style={[styles.cellRate, styles.bold]}>Rate</Text>
            <Text style={[styles.cellAmount, styles.bold]}>Amount</Text>
          </View>
          {data.lines.map((l, i) => (
            <View key={i} style={styles.tr} wrap={false}>
              <Text style={styles.cellDate}>{fmtDate(l.start_time)}</Text>
              <Text style={styles.cellTopic}>{l.topic}</Text>
              <Text style={styles.cellHours}>{l.hours.toFixed(2)}</Text>
              <Text style={styles.cellRate}>{money(l.rate)}</Text>
              <Text style={styles.cellAmount}>{money(l.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Subtotal</Text>
          <Text style={styles.totalsValue}>{money(data.subtotal)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Amount Due</Text>
          <Text style={styles.totalsValue}>{money(data.amountDue)}</Text>
        </View>

        {data.notes && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionHeading}>Notes</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Thank you for your business — {data.organizationName}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(
  data: InvoicePdfData,
): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<InvoiceDocument data={data} />);
  return new Uint8Array(buffer);
}
