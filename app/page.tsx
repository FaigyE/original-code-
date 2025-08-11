"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/router"
import { processCsvData } from "@/utils/csvProcessor"
import { parseExcelFile } from "@/utils/excelParser"

const Page = () => {
  const [file, setFile] = useState<File | null>(null)
  const [customerInfo, setCustomerInfo] = useState<any>({})
  const [loading, setLoading] = useState<boolean>(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    try {
      let parsedData: any[] = []

      // Check file extension to determine how to parse
      const fileExtension = file.name.split(".").pop()?.toLowerCase()
      console.log(`Processing ${fileExtension} file: ${file.name}`)

      if (fileExtension === "csv") {
        // Parse CSV file directly
        const csvText = await file.text()
        parsedData = await processCsvData(csvText)
        localStorage.setItem("rawInstallationData", JSON.stringify(parsedData))
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        // Parse Excel file - it will be converted to CSV internally and use the same processing logic
        parsedData = await parseExcelFile(file)
        localStorage.setItem("consolidatedData", JSON.stringify(parsedData))
      } else {
        throw new Error("Unsupported file format. Please upload a CSV or Excel file.")
      }

      console.log(`Final parsed data length: ${parsedData.length}`)
      console.log("Sample of final data:", parsedData.slice(0, 3))
      console.log("Last 3 rows of final data:", parsedData.slice(-3))

      // Store customer info in localStorage
      localStorage.setItem("customerInfo", JSON.stringify(customerInfo))

      router.push("/csv-preview")
    } catch (error) {
      console.error("Error parsing file:", error)
      alert(error instanceof Error ? error.message : "An error occurred while processing the file")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Submit"}
        </button>
      </form>
    </div>
  )
}

export default Page
