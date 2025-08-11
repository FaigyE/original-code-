"use client"
import { useState, useEffect } from "react"
import EditableText from "@/components/editable-text"
import { getAeratorDescription, formatNote } from "../aerator-helpers"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import type { ConsolidatedUnit } from "@/lib/excel-parser"

interface InstallationData {
  Unit: string
  "Shower Head"?: string
  "Bathroom aerator"?: string
  "Kitchen Aerator"?: string
  "Leak Issue Kitchen Faucet"?: string
  "Leak Issue Bath Faucet"?: string
  "Tub Spout/Diverter Leak Issue"?: string
  Notes?: string
  [key: string]: string | undefined
}

interface ReportDetailPageProps {
  installationData?: InstallationData[]
  consolidatedData?: ConsolidatedUnit[]
  isPreview?: boolean
  isEditable?: boolean
}

const useReportContext = () => {
  const [sectionTitles, setSectionTitles] = useState({
    detailsTitle: "Detailed Unit Information",
  })

  useEffect(() => {
    const stored = localStorage.getItem("sectionTitles")
    if (stored) {
      try {
        setSectionTitles(JSON.parse(stored))
      } catch (error) {
        console.error("Error parsing section titles:", error)
      }
    }
  }, [])

  return { sectionTitles, setSectionTitles }
}

const getFinalNoteForUnit = (unit: string, defaultNote = ""): string => {
  try {
    const storedNotes = localStorage.getItem("unifiedNotes")
    if (storedNotes) {
      const notes = JSON.parse(storedNotes)
      return notes[unit] || defaultNote
    }
  } catch (error) {
    console.error("Error getting note for unit:", error)
  }
  return defaultNote
}

const updateStoredNote = (unit: string, note: string) => {
  try {
    const storedNotes = localStorage.getItem("unifiedNotes") || "{}"
    const notes = JSON.parse(storedNotes)
    notes[unit] = note
    localStorage.setItem("unifiedNotes", JSON.stringify(notes))
    window.dispatchEvent(new Event("unifiedNotesUpdated"))
  } catch (error) {
    console.error("Error updating note:", error)
  }
}

const getStoredNotes = () => {
  try {
    const storedNotes = localStorage.getItem("unifiedNotes")
    return storedNotes ? JSON.parse(storedNotes) : {}
  } catch (error) {
    console.error("Error getting stored notes:", error)
    return {}
  }
}

export default function ReportDetailPage({
  installationData = [],
  consolidatedData = [],
  isPreview = true,
  isEditable = true,
}: ReportDetailPageProps) {
  const { sectionTitles, setSectionTitles } = useReportContext()

  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({})
  const [editedInstallations, setEditedInstallations] = useState<Record<string, Record<string, string>>>({})
  const [editedUnits, setEditedUnits] = useState<Record<string, string>>({})
  const [additionalRows, setAdditionalRows] = useState<ConsolidatedUnit[]>([])
  const [columnHeaders, setColumnHeaders] = useState({
    unit: "Unit",
    kitchen: "Kitchen Installed",
    bathroom: "Bathroom Installed",
    shower: "Shower Installed",
    toilet: "Toilet Installed",
    notes: "Notes",
  })

  const processedData: ConsolidatedUnit[] =
    consolidatedData.length > 0 ? consolidatedData : convertInstallationDataToConsolidated(installationData)

  function convertInstallationDataToConsolidated(data: InstallationData[]): ConsolidatedUnit[] {
    return data.map((item) => ({
      unit: item.Unit || "",
      kitchenAeratorCount: isAeratorInstalled(item["Kitchen Aerator"] || "") ? 1 : 0,
      bathroomAeratorCount: isAeratorInstalled(item["Bathroom aerator"] || "") ? 1 : 0,
      showerHeadCount: isAeratorInstalled(item["Shower Head"] || "") ? 1 : 0,
    }))
  }

  function isAeratorInstalled(value: string): boolean {
    if (!value) return false
    const lowerValue = value.toLowerCase().trim()
    return (
      lowerValue === "male" ||
      lowerValue === "female" ||
      lowerValue === "insert" ||
      lowerValue.includes("gpm") ||
      lowerValue === "1" ||
      lowerValue === "2"
    )
  }

  const getNotAccessedMessage = (): string => {
    return "Unit not accessed."
  }

  const allData = [...additionalRows, ...processedData]

  const sortDataByUnit = (data: ConsolidatedUnit[]) => {
    return [...data].sort((a, b) => {
      const finalUnitA = editedUnits[a.unit] !== undefined ? editedUnits[a.unit] : a.unit
      const finalUnitB = editedUnits[b.unit] !== undefined ? editedUnits[b.unit] : b.unit

      if (!finalUnitA || finalUnitA.trim() === "") return -1
      if (!finalUnitB || finalUnitB.trim() === "") return 1

      const numA = Number.parseInt(finalUnitA)
      const numB = Number.parseInt(finalUnitB)

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }

      return finalUnitA.localeCompare(finalUnitB, undefined, { numeric: true, sensitivity: "base" })
    })
  }

  const filteredData = (() => {
    const result = allData.filter((item) => {
      const isAdditionalRow = additionalRows.some((row) => row.unit === item.unit)
      if (isAdditionalRow) return true

      return item.unit && item.unit.trim() !== ""
    })

    return sortDataByUnit(result)
  })()

  const itemsPerPage = 10
  const dataPages = []
  for (let i = 0; i < filteredData.length; i += itemsPerPage) {
    dataPages.push(filteredData.slice(i, i + itemsPerPage))
  }

  const hasKitchenAerators = true // Always show kitchen aerator columns
  const hasBathroomAerators = true // Always show bathroom aerator columns
  const hasShowers = filteredData.some((item) => item.showerHeadCount > 0) || additionalRows.length > 0
  const hasToilets = false
  const hasNotes = true

  const compileNotesForUnit = (item: ConsolidatedUnit, includeNotAccessed = true): string => {
    let notes = ""

    const isUnitNotAccessed =
      item.kitchenAeratorCount === 0 && item.bathroomAeratorCount === 0 && item.showerHeadCount === 0

    if (isUnitNotAccessed && !notes.trim() && includeNotAccessed) {
      notes = getNotAccessedMessage()
    }

    return formatNote(notes.trim())
  }

  const handleNoteEdit = (unit: string, value: string) => {
    if (isEditable) {
      updateStoredNote(unit, value)
      setEditedNotes((prev) => {
        const updated = { ...prev, [unit]: value }
        return updated
      })
    }
  }

  const handleInstallationEdit = (unit: string, column: string, value: string) => {
    if (isEditable) {
      const isAdditionalRow = additionalRows.some((row) => row.unit === unit)

      if (isAdditionalRow) {
        const updatedRows = additionalRows.map((row) => {
          if (row.unit === unit) {
            const updatedRow = { ...row }
            if (column === "kitchen") {
              updatedRow.kitchenAeratorCount = value ? 1 : 0
            } else if (column === "bathroom") {
              updatedRow.bathroomAeratorCount = value ? 1 : 0
            } else if (column === "shower") {
              updatedRow.showerHeadCount = value ? 1 : 0
            }
            return updatedRow
          }
          return row
        })
        setAdditionalRows(updatedRows)
        localStorage.setItem("additionalDetailRows", JSON.stringify(updatedRows))
      } else {
        setEditedInstallations((prev) => {
          const unitData = prev[unit] || {}
          const updated = {
            ...prev,
            [unit]: {
              ...unitData,
              [column]: value,
            },
          }
          localStorage.setItem("detailInstallations", JSON.stringify(updated))
          return updated
        })
      }
    }
  }

  const handleUnitEdit = (originalUnit: string, newUnit: string) => {
    if (isEditable) {
      const isAdditionalRow = additionalRows.some((row) => row.unit === originalUnit)

      if (isAdditionalRow) {
        const updatedRows = additionalRows.map((row) => {
          if (row.unit === originalUnit) {
            return { ...row, unit: newUnit }
          }
          return row
        })
        setAdditionalRows(updatedRows)
        localStorage.setItem("additionalDetailRows", JSON.stringify(updatedRows))
      } else {
        if (newUnit === "") {
          setEditedUnits((prev) => {
            const updated = { ...prev, [originalUnit]: "" }
            localStorage.setItem("editedUnits", JSON.stringify(updated))
            return updated
          })
        } else {
          setEditedUnits((prev) => {
            const updated = { ...prev, [originalUnit]: newUnit }
            localStorage.setItem("editedUnits", JSON.stringify(updated))
            return updated
          })
        }
      }
    }
  }

  const handleAddRow = () => {
    if (isEditable) {
      const newRow: ConsolidatedUnit = {
        unit: "",
        kitchenAeratorCount: 0,
        bathroomAeratorCount: 0,
        showerHeadCount: 0,
      }

      const updatedRows = [newRow, ...additionalRows]
      setAdditionalRows(updatedRows)
      localStorage.setItem("additionalDetailRows", JSON.stringify(updatedRows))
    }
  }

  const handleDeleteRow = (item: ConsolidatedUnit) => {
    if (isEditable) {
      const isAdditionalRow = additionalRows.some((row) => row.unit === item.unit)

      if (isAdditionalRow) {
        const updatedRows = additionalRows.filter((row) => row.unit !== item.unit)
        setAdditionalRows(updatedRows)
        localStorage.setItem("additionalDetailRows", JSON.stringify(updatedRows))
      } else {
        handleUnitEdit(item.unit, "")
      }

      if (item.unit) {
        const storedNotes = getStoredNotes()
        if (storedNotes[item.unit]) {
          const updatedStoredNotes = { ...storedNotes }
          delete updatedStoredNotes[item.unit]
          localStorage.setItem("unifiedNotes", JSON.stringify(updatedStoredNotes))
          window.dispatchEvent(new Event("unifiedNotesUpdated"))
        }
      }
    }
  }

  const handleSectionTitleChange = (value: string) => {
    if (isEditable) {
      setSectionTitles((prev) => {
        const updated = { ...prev, detailsTitle: value }
        localStorage.setItem("sectionTitles", JSON.stringify(updated))
        return updated
      })
    }
  }

  const handleColumnHeaderChange = (column: string, value: string) => {
    if (isEditable) {
      setColumnHeaders((prev) => {
        const updated = { ...prev, [column]: value }
        localStorage.setItem("columnHeaders", JSON.stringify(updated))
        return updated
      })
    }
  }

  useEffect(() => {
    const storedInstallations = localStorage.getItem("detailInstallations")
    if (storedInstallations) {
      try {
        setEditedInstallations(JSON.parse(storedInstallations))
      } catch (error) {
        console.error("Error parsing stored installations:", error)
      }
    }

    const storedHeaders = localStorage.getItem("columnHeaders")
    if (storedHeaders) {
      try {
        setColumnHeaders(JSON.parse(storedHeaders))
      } catch (error) {
        console.error("Error parsing stored headers:", error)
      }
    }

    const storedUnits = localStorage.getItem("editedUnits")
    if (storedUnits) {
      try {
        setEditedUnits(JSON.parse(storedUnits))
      } catch (error) {
        console.error("Error parsing stored units:", error)
      }
    }

    const storedRows = localStorage.getItem("additionalDetailRows")
    if (storedRows) {
      try {
        const parsedRows = JSON.parse(storedRows)
        setAdditionalRows(parsedRows)
      } catch (error) {
        console.error("Error parsing stored additional rows:", error)
      }
    }
  }, [])

  useEffect(() => {
    const handleNotesUpdate = () => {
      setEditedNotes((prev) => ({ ...prev }))
    }

    window.addEventListener("unifiedNotesUpdated", handleNotesUpdate)
    return () => window.removeEventListener("unifiedNotesUpdated", handleNotesUpdate)
  }, [])

  const detailsTitle = sectionTitles.detailsTitle || "Detailed Unit Information"

  return isPreview ? (
    <div className="report-page min-h-[1056px] relative">
      <div className="mb-8">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115501-BD1uw5tVq9PtVYW6Z6FKM1i8in6GeV.png"
          alt="GreenLight Logo"
          className="h-24"
          crossOrigin="anonymous"
        />
      </div>
      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {isEditable ? (
              <EditableText
                value={detailsTitle}
                onChange={handleSectionTitleChange}
                placeholder="Section Title"
                className="text-xl font-bold"
              />
            ) : (
              detailsTitle
            )}
          </h2>
          {isEditable && (
            <Button onClick={handleAddRow} size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 border-b">
                {isEditable ? (
                  <EditableText
                    value={columnHeaders.unit}
                    onChange={(value) => handleColumnHeaderChange("unit", value)}
                    placeholder="Unit"
                  />
                ) : (
                  columnHeaders.unit
                )}
              </th>
              {hasKitchenAerators && (
                <th className="text-left py-2 px-2 border-b">
                  {isEditable ? (
                    <EditableText
                      value={columnHeaders.kitchen}
                      onChange={(value) => handleColumnHeaderChange("kitchen", value)}
                      placeholder="Kitchen"
                    />
                  ) : (
                    columnHeaders.kitchen
                  )}
                </th>
              )}
              {hasBathroomAerators && (
                <th className="text-left py-2 px-2 border-b">
                  {isEditable ? (
                    <EditableText
                      value={columnHeaders.bathroom}
                      onChange={(value) => handleColumnHeaderChange("bathroom", value)}
                      placeholder="Bathroom"
                    />
                  ) : (
                    columnHeaders.bathroom
                  )}
                </th>
              )}
              {hasShowers && (
                <th className="text-left py-2 px-2 border-b">
                  {isEditable ? (
                    <EditableText
                      value={columnHeaders.shower}
                      onChange={(value) => handleColumnHeaderChange("shower", value)}
                      placeholder="Shower"
                    />
                  ) : (
                    columnHeaders.shower
                  )}
                </th>
              )}
              {hasToilets && (
                <th className="text-left py-2 px-2 border-b">
                  {isEditable ? (
                    <EditableText
                      value={columnHeaders.toilet}
                      onChange={(value) => handleColumnHeaderChange("toilet", value)}
                      placeholder="Toilet"
                    />
                  ) : (
                    columnHeaders.toilet
                  )}
                </th>
              )}
              {hasNotes && (
                <th className="text-left py-2 px-2 border-b">
                  {isEditable ? (
                    <EditableText
                      value={columnHeaders.notes}
                      onChange={(value) => handleColumnHeaderChange("notes", value)}
                      placeholder="Notes"
                    />
                  ) : (
                    columnHeaders.notes
                  )}
                </th>
              )}
              {isEditable && <th className="text-left py-2 px-2 border-b w-16">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => {
              const isAdditionalRow = additionalRows.some((row) => row.unit === item.unit)

              const kitchenAerator = getAeratorDescription(item.kitchenAeratorCount, "kitchen")
              const bathroomAerator = getAeratorDescription(item.bathroomAeratorCount, "bathroom")
              const shower = getAeratorDescription(item.showerHeadCount, "shower")
              const toilet = ""

              const compiledNotes = compileNotesForUnit(item, true)
              const finalNote = getFinalNoteForUnit(item.unit, compiledNotes)

              return (
                <tr key={index}>
                  <td className="py-2 px-2 border-b">
                    {isEditable ? (
                      <EditableText
                        value={editedUnits[item.unit] !== undefined ? editedUnits[item.unit] : item.unit}
                        onChange={(value) => handleUnitEdit(item.unit, value)}
                        placeholder="Unit number"
                      />
                    ) : editedUnits[item.unit] !== undefined ? (
                      editedUnits[item.unit]
                    ) : (
                      item.unit
                    )}
                  </td>
                  {hasKitchenAerators && (
                    <td className="py-2 px-2 border-b text-center">
                      {isEditable ? (
                        <EditableText
                          value={
                            editedInstallations[item.unit]?.kitchen !== undefined
                              ? editedInstallations[item.unit]!.kitchen
                              : kitchenAerator === "No Touch."
                                ? ""
                                : kitchenAerator
                          }
                          onChange={(value) => handleInstallationEdit(item.unit, "kitchen", value)}
                          placeholder="Kitchen"
                          className="text-center"
                        />
                      ) : kitchenAerator === "No Touch." ? (
                        "—"
                      ) : (
                        kitchenAerator
                      )}
                    </td>
                  )}
                  {hasBathroomAerators && (
                    <td className="py-2 px-2 border-b text-center">
                      {isEditable ? (
                        <EditableText
                          value={
                            editedInstallations[item.unit]?.bathroom !== undefined
                              ? editedInstallations[item.unit]!.bathroom
                              : bathroomAerator === "No Touch."
                                ? ""
                                : bathroomAerator
                          }
                          onChange={(value) => handleInstallationEdit(item.unit, "bathroom", value)}
                          placeholder="Bathroom"
                          className="text-center"
                        />
                      ) : bathroomAerator === "No Touch." ? (
                        "—"
                      ) : (
                        bathroomAerator
                      )}
                    </td>
                  )}
                  {hasShowers && (
                    <td className="py-2 px-2 border-b text-center">
                      {isEditable ? (
                        <EditableText
                          value={
                            editedInstallations[item.unit]?.shower !== undefined
                              ? editedInstallations[item.unit]!.shower
                              : shower === "No Touch."
                                ? ""
                                : shower
                          }
                          onChange={(value) => handleInstallationEdit(item.unit, "shower", value)}
                          placeholder="Shower"
                          className="text-center"
                        />
                      ) : shower === "No Touch." ? (
                        "—"
                      ) : (
                        shower
                      )}
                    </td>
                  )}
                  {hasToilets && (
                    <td className="py-2 px-2 border-b text-center">
                      {isEditable ? (
                        <EditableText
                          value={
                            editedInstallations[item.unit]?.toilet !== undefined
                              ? editedInstallations[item.unit].toilet
                              : toilet || ""
                          }
                          onChange={(value) => handleInstallationEdit(item.unit, "toilet", value)}
                          placeholder="Toilet"
                          className="text-center"
                        />
                      ) : (
                        toilet || "—"
                      )}
                    </td>
                  )}
                  {hasNotes && (
                    <td className="py-2 px-2 border-b">
                      {isEditable ? (
                        <EditableText
                          value={finalNote}
                          onChange={(value) => handleNoteEdit(item.unit, value)}
                          placeholder="Notes"
                          multiline={true}
                        />
                      ) : (
                        finalNote
                      )}
                    </td>
                  )}
                  {isEditable && (
                    <td className="py-2 px-2 border-b">
                      <Button
                        onClick={() => handleDeleteRow(item)}
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        title={isAdditionalRow ? "Delete row" : "Mark row as deleted"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="footer-container">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115454-uWCS2yWrowegSqw9c2SIVcLdedTk82.png"
          alt="GreenLight Footer"
          className="w-full h-auto"
          crossOrigin="anonymous"
        />
      </div>
    </div>
  ) : (
    <>
      {dataPages.map((pageData, pageIndex) => (
        <div key={pageIndex} className="report-page min-h-[1056px] relative">
          <div className="mb-8">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115501-BD1uw5tVq9PtVYW6Z6FKM1i8in6GeV.png"
              alt="GreenLight Logo"
              className="h-24"
              crossOrigin="anonymous"
            />
          </div>
          <div className="mb-16">
            <h2 className="text-xl font-bold mb-6">{detailsTitle}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 px-2 border-b">{columnHeaders.unit}</th>
                  {hasKitchenAerators && <th className="text-left py-2 px-2 border-b">{columnHeaders.kitchen}</th>}
                  {hasBathroomAerators && <th className="text-left py-2 px-2 border-b">{columnHeaders.bathroom}</th>}
                  {hasShowers && <th className="text-left py-2 px-2 border-b">{columnHeaders.shower}</th>}
                  {hasToilets && <th className="text-left py-2 px-2 border-b">{columnHeaders.toilet}</th>}
                  {hasNotes && <th className="text-left py-2 px-2 border-b">{columnHeaders.notes}</th>}
                </tr>
              </thead>
              <tbody>
                {pageData.map((item, index) => {
                  const kitchenAerator = getAeratorDescription(item.kitchenAeratorCount, "kitchen")
                  const bathroomAerator = getAeratorDescription(item.bathroomAeratorCount, "bathroom")
                  const shower = getAeratorDescription(item.showerHeadCount, "shower")
                  const toilet = ""
                  const compiledNotes = compileNotesForUnit(item, true)
                  const finalNote = getFinalNoteForUnit(item.unit, compiledNotes)

                  return (
                    <tr key={index}>
                      <td className="py-2 px-2 border-b">
                        {editedUnits[item.unit] !== undefined ? editedUnits[item.unit] : item.unit}
                      </td>
                      {hasKitchenAerators && (
                        <td className="py-2 px-2 border-b text-center">
                          {kitchenAerator === "No Touch." ? "—" : kitchenAerator}
                        </td>
                      )}
                      {hasBathroomAerators && (
                        <td className="py-2 px-2 border-b text-center">
                          {bathroomAerator === "No Touch." ? "—" : bathroomAerator}
                        </td>
                      )}
                      {hasShowers && (
                        <td className="py-2 px-2 border-b text-center">{shower === "No Touch." ? "—" : shower}</td>
                      )}
                      {hasToilets && <td className="py-2 px-2 border-b text-center">{toilet || "—"}</td>}
                      {hasNotes && <td className="py-2 px-2 border-b">{finalNote}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="footer-container">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115454-uWCS2yWrowegSqw9c2SIVcLdedTk82.png"
              alt="GreenLight Footer"
              className="w-full h-auto"
              crossOrigin="anonymous"
            />
          </div>
          <div className="absolute top-4 right-4 text-sm">Page {7 + pageIndex} of 21</div>
        </div>
      ))}
    </>
  )
}
