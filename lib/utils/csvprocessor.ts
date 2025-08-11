export async function processCsvData(csvText: string): Promise<any[]> {
  const lines = csvText.split("\n")
  const headers = lines[0].split(",").map((h) => h.trim())

  const data = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",")
    if (values.length === headers.length) {
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || ""
      })
      data.push(row)
    }
  }

  return data
}
