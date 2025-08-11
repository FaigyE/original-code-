import * as XLSX from "xlsx"

interface ExcelRow {
  unit: string
  toilet: string
  kitchenAerator: string
  bathroomAerator: string
  showerHead: string
  // Add other fields as needed
}

export interface ConsolidatedUnit {
  unit: string
  kitchenAeratorCount: number
  bathroomAeratorCount: number
  showerHeadCount: number
}

/**
 * Checks if a value indicates an aerator was installed
 */
const isAeratorInstalled = (value: string): boolean => {
  if (!value) return false

  const lowerValue = value.toLowerCase().trim()

  // Check for installation indicators
  return (
    lowerValue === "male" ||
    lowerValue === "female" ||
    lowerValue === "insert" ||
    lowerValue.includes("gpm") ||
    lowerValue === "1" ||
    lowerValue === "2"
  )
}

/**
 * Consolidates multiple Excel rows for the same unit
 */
const consolidateUnitData = (excelRows: ExcelRow[]): ConsolidatedUnit[] => {
  const unitGroups = new Map<string, ExcelRow[]>()

  // Group rows by unit number
  excelRows.forEach((row) => {
    if (!unitGroups.has(row.unit)) {
      unitGroups.set(row.unit, [])
    }
    unitGroups.get(row.unit)!.push(row)
  })

  // Consolidate each unit's data
  const consolidated: ConsolidatedUnit[] = []

  unitGroups.forEach((rows, unit) => {
    let kitchenAeratorCount = 0
    let bathroomAeratorCount = 0
    let showerHeadCount = 0

    rows.forEach((row) => {
      // Count kitchen aerator installations
      if (isAeratorInstalled(row.kitchenAerator)) {
        kitchenAeratorCount++
      }

      // Count bathroom aerator installations
      if (isAeratorInstalled(row.bathroomAerator)) {
        bathroomAeratorCount++
      }

      // Count shower head installations
      if (isAeratorInstalled(row.showerHead)) {
        showerHeadCount++
      }
    })

    consolidated.push({
      unit,
      kitchenAeratorCount,
      bathroomAeratorCount,
      showerHeadCount,
    })
  })

  return consolidated
}

/**
 * Parse Excel file and return consolidated unit data
 */
export const parseExcelFile = (file: File): Promise<ConsolidatedUnit[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        // Skip header row and parse data
        const excelRows: ExcelRow[] = []

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[]

          // Map Excel columns - ADJUST THESE INDICES TO MATCH YOUR EXCEL
          excelRows.push({
            unit: row[0]?.toString() || "", // Column A: Unit
            toilet: row[1]?.toString() || "", // Column B: Toilet
            kitchenAerator: row[10]?.toString() || "", // Column K: Kitchen Aerator
            bathroomAerator: row[11]?.toString() || "", // Column L: Bathroom aerator
            showerHead: row[7]?.toString() || "", // Column H: Shower Head
          })
        }

        // Filter out empty rows
        const validRows = excelRows.filter((row) => row.unit.trim() !== "")

        // Consolidate the data
        const consolidated = consolidateUnitData(validRows)
        resolve(consolidated)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsArrayBuffer(file)
  })
}
