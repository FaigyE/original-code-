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
 * Dynamically finds column indices based on header keywords
 */
const findColumnIndices = (
  headers: any[],
): {
  unitIndex: number
  toiletIndex: number
  kitchenAeratorIndex: number
  bathroomAeratorIndex: number
  showerHeadIndex: number
} => {
  console.log("Excel Parser: Analyzing headers:", headers)

  const headerStrings = headers.map((h) => (h || "").toString().toLowerCase())

  const unitIndex = headerStrings.findIndex((h) => h.includes("unit") || h.includes("apt") || h.includes("apartment"))

  const toiletIndex = headerStrings.findIndex((h) => h.includes("toilet") || h.includes("wc"))

  const kitchenAeratorIndex = headerStrings.findIndex(
    (h) =>
      (h.includes("kitchen") && h.includes("aerator")) ||
      (h.includes("kitchen") && h.includes("faucet")) ||
      h.includes("kitchen aerator") ||
      h.includes("kit aerator"),
  )

  const bathroomAeratorIndex = headerStrings.findIndex(
    (h) =>
      (h.includes("bathroom") && h.includes("aerator")) ||
      (h.includes("bath") && h.includes("aerator")) ||
      h.includes("bathroom aerator") ||
      h.includes("bath aerator"),
  )

  const showerHeadIndex = headerStrings.findIndex(
    (h) =>
      (h.includes("shower") && (h.includes("head") || h.includes("aerator"))) ||
      h.includes("showerhead") ||
      h.includes("shower head"),
  )

  console.log("Excel Parser: Found column indices:", {
    unit: unitIndex,
    toilet: toiletIndex,
    kitchenAerator: kitchenAeratorIndex,
    bathroomAerator: bathroomAeratorIndex,
    showerHead: showerHeadIndex,
  })

  return {
    unitIndex,
    toiletIndex,
    kitchenAeratorIndex,
    bathroomAeratorIndex,
    showerHeadIndex,
  }
}

/**
 * Checks if a value indicates an aerator was installed
 */
const isAeratorInstalled = (value: string): boolean => {
  if (!value) return false

  const lowerValue = value.toLowerCase().trim()

  // Check for installation indicators
  const isInstalled =
    lowerValue === "male" ||
    lowerValue === "female" ||
    lowerValue === "insert" ||
    lowerValue.includes("gpm") ||
    lowerValue === "1" ||
    lowerValue === "2" ||
    lowerValue === "yes" ||
    lowerValue === "installed" ||
    lowerValue === "x"

  if (isInstalled) {
    console.log(`Excel Parser: Detected installation for value "${value}"`)
  }

  return isInstalled
}

/**
 * Consolidates multiple Excel rows for the same unit
 */
const consolidateUnitData = (excelRows: ExcelRow[]): ConsolidatedUnit[] => {
  console.log(`Excel Parser: Starting consolidation of ${excelRows.length} rows`)

  const unitGroups = new Map<string, ExcelRow[]>()

  // Group rows by unit number
  excelRows.forEach((row) => {
    if (!unitGroups.has(row.unit)) {
      unitGroups.set(row.unit, [])
    }
    unitGroups.get(row.unit)!.push(row)
  })

  console.log(`Excel Parser: Created ${unitGroups.size} unit groups`)

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

    if (kitchenAeratorCount > 1 || bathroomAeratorCount > 1 || showerHeadCount > 1) {
      console.log(`Excel Parser: Unit ${unit} has multiple installations:`, {
        kitchen: kitchenAeratorCount,
        bathroom: bathroomAeratorCount,
        shower: showerHeadCount,
      })
    }

    consolidated.push({
      unit,
      kitchenAeratorCount,
      bathroomAeratorCount,
      showerHeadCount,
    })
  })

  console.log(`Excel Parser: Consolidation complete. ${consolidated.length} consolidated units created`)
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
        console.log(`Excel Parser: Processing file ${file.name}`)

        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        console.log(`Excel Parser: Extracted ${jsonData.length} rows from Excel`)

        if (jsonData.length === 0) {
          reject(new Error("Excel file is empty"))
          return
        }

        const headers = jsonData[0] as any[]
        const columnIndices = findColumnIndices(headers)

        // Validate that we found the essential columns
        if (columnIndices.unitIndex === -1) {
          reject(
            new Error(
              "Could not find Unit column. Please ensure your Excel has a column containing 'unit', 'apt', or 'apartment'",
            ),
          )
          return
        }

        console.log("Excel Parser: Header row:", headers)
        if (jsonData.length > 1) {
          console.log("Excel Parser: Sample data row:", jsonData[1])
        }

        const excelRows: ExcelRow[] = []
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[]

          excelRows.push({
            unit: row[columnIndices.unitIndex]?.toString() || "",
            toilet: columnIndices.toiletIndex !== -1 ? row[columnIndices.toiletIndex]?.toString() || "" : "",
            kitchenAerator:
              columnIndices.kitchenAeratorIndex !== -1 ? row[columnIndices.kitchenAeratorIndex]?.toString() || "" : "",
            bathroomAerator:
              columnIndices.bathroomAeratorIndex !== -1
                ? row[columnIndices.bathroomAeratorIndex]?.toString() || ""
                : "",
            showerHead:
              columnIndices.showerHeadIndex !== -1 ? row[columnIndices.showerHeadIndex]?.toString() || "" : "",
          })
        }

        // Filter out empty rows
        const validRows = excelRows.filter((row) => row.unit.trim() !== "")
        console.log(`Excel Parser: ${validRows.length} valid rows after filtering`)

        // Consolidate the data
        const consolidated = consolidateUnitData(validRows)

        // Save consolidated data to localStorage
        localStorage.setItem("consolidatedData", JSON.stringify(consolidated))
        console.log(`Excel Parser: Saved ${consolidated.length} consolidated units to localStorage`)

        resolve(consolidated)
      } catch (error) {
        console.error("Excel Parser: Error processing file:", error)
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsArrayBuffer(file)
  })
}
