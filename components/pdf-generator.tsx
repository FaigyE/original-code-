import type React from "react"
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer"
import { getAeratorDescription } from "./aerator-helpers"
import type { ConsolidatedUnit } from "./excel-parser"

// Your existing styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 30,
  },
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableColHeader: {
    width: "20%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f0f0f0",
  },
  tableCol: {
    width: "20%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCellHeader: {
    margin: "auto",
    marginTop: 5,
    marginBottom: 5,
    fontSize: 12,
    fontWeight: "bold",
  },
  tableCell: {
    margin: "auto",
    marginTop: 5,
    marginBottom: 5,
    fontSize: 10,
  },
})

interface PDFReportProps {
  consolidatedData: ConsolidatedUnit[]
  reportTitle?: string
}

const PDFReport: React.FC<PDFReportProps> = ({ consolidatedData, reportTitle = "Water Installation Report" }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.title}>{reportTitle}</Text>

        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Unit</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Kitchen Aerator</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Bathroom Aerator</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Shower Head</Text>
            </View>
          </View>

          {/* Data Rows */}
          {consolidatedData.map((unit, index) => (
            <View style={styles.tableRow} key={index}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{unit.unit}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{getAeratorDescription(unit.kitchenAeratorCount, "kitchen")}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{getAeratorDescription(unit.bathroomAeratorCount, "bathroom")}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{getAeratorDescription(unit.showerHeadCount, "shower")}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Page>
  </Document>
)

interface PDFGeneratorProps {
  consolidatedData: ConsolidatedUnit[]
  fileName?: string
}

export const PDFGenerator: React.FC<PDFGeneratorProps> = ({
  consolidatedData,
  fileName = "water-installation-report.pdf",
}) => {
  return (
    <PDFDownloadLink document={<PDFReport consolidatedData={consolidatedData} />} fileName={fileName}>
      {({ blob, url, loading, error }) => (loading ? "Loading document..." : "Download PDF")}
    </PDFDownloadLink>
  )
}

export default PDFGenerator
