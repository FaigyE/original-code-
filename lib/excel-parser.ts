import * as XLSX from "xlsx"

// Interface for the original Excel row data
interface OriginalExcelRow {
  [key: string]: any
}

export interface ConsolidatedUnit {
  unit: string
  kitchenAeratorCount: number
  bathroomAeratorCount: number
  showerHeadCount: number
}

export async function parseExcelFile(file: File): Promise<OriginalExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        console.log("Excel Parser: Processing file", file.name)
        console.log("Excel Parser: Extracted", jsonData.length, "rows from Excel")

        if (jsonData.length === 0) {
          throw new Error("Excel file is empty")
        }

        // Get headers from first row
        const headers = jsonData[0] as string[]
        console.log("Excel Parser: Analyzing headers:", headers)

        // Convert rows to objects using headers
        const originalData: OriginalExcelRow[] = []

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const rowObject: OriginalExcelRow = {}
          headers.forEach((header, index) => {
            if (header) {
              rowObject[header] = row[index] || ""
            }
          })

          // Find unit column
          const unitValue = findUnitValue(rowObject)
          if (unitValue && isValidUnit(unitValue)) {
            originalData.push(rowObject)
          }
        }

        console.log("Excel Parser: Preserved", originalData.length, "original rows with all", headers.length, "columns")

        // Save original data for CSV preview (with all columns)
        localStorage.setItem("rawInstallationData", JSON.stringify(originalData))

        // Create consolidated data for reports
        const consolidatedData = createConsolidatedData(originalData)

        localStorage.setItem("consolidatedData", JSON.stringify(consolidatedData))

        // Also save a toilet count (can be calculated or set to 0 for now)
        localStorage.setItem("toiletCount", JSON.stringify(0))

        console.log("Excel Parser: Created", consolidatedData.length, "consolidated units")

        resolve(originalData)
      } catch (error) {
        console.error("Excel Parser: Error processing file:", error)
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Failed to read Excel file"))
    reader.readAsArrayBuffer(file)
  })
}

function findUnitValue(row: OriginalExcelRow): string | null {
  // Look for unit column by common names
  const unitKeys = ["unit", "Unit", "UNIT", "apt", "apartment", "room", "Room"]

  for (const key of unitKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return String(row[key]).trim()
    }
  }

  // Look for any key containing "unit"
  for (const key of Object.keys(row)) {
    if (key.toLowerCase().includes("unit") && row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return String(row[key]).trim()
    }
  }

  return null
}

function isValidUnit(unit: string): boolean {
  if (!unit || unit.trim() === "") return false

  const lowerUnit = unit.toLowerCase().trim()
  const invalidValues = [
    "total",
    "sum",
    "average",
    "avg",
    "count",
    "header",
    "n/a",
    "na",
    "grand total",
    "subtotal",
    "summary",
    "totals",
    "grand",
    "sub total",
  ]

  return !invalidValues.some((val) => lowerUnit.includes(val))
}

function createConsolidatedData(originalData: OriginalExcelRow[]): ConsolidatedUnit[] {
  const unitGroups: { [unit: string]: OriginalExcelRow[] } = {}

  // Group by unit
  originalData.forEach((row) => {
    const unit = findUnitValue(row)
    if (unit) {
      if (!unitGroups[unit]) {
        unitGroups[unit] = []
      }
      unitGroups[unit].push(row)
    }
  })

  // Create consolidated units
  const consolidated: ConsolidatedUnit[] = []

  Object.entries(unitGroups).forEach(([unit, rows]) => {
    let kitchenAeratorCount = 0
    let bathroomAeratorCount = 0
    let showerHeadCount = 0

    rows.forEach((row) => {
      // Count installations based on row data
      Object.entries(row).forEach(([key, value]) => {
        if (value && String(value).toLowerCase().includes("aerator")) {
          if (key.toLowerCase().includes("kitchen")) {
            kitchenAeratorCount++
          } else if (key.toLowerCase().includes("bathroom")) {
            bathroomAeratorCount++
          }
        } else if (value && String(value).toLowerCase().includes("shower")) {
          showerHeadCount++
        }
      })
    })

    consolidated.push({
      unit,
      kitchenAeratorCount,
      bathroomAeratorCount,
      showerHeadCount,
    })
  })

  return consolidated.sort((a, b) => {
    const numA = Number.parseInt(a.unit)
    const numB = Number.parseInt(b.unit)

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB
    }

    return a.unit.localeCompare(b.unit, undefined, { numeric: true, sensitivity: "base" })
  })
}
