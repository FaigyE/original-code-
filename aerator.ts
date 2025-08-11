/**
 * Gets aerator description based on consolidated count
 */
export const getAeratorDescription = (count: number, type: "kitchen" | "bathroom" | "shower"): string => {
  console.log(`getAeratorDescription called with count: ${count}, type: ${type}`)

  if (count === 0) return "No Touch."

  const baseGPM = type === "shower" ? "1.75 GPM" : "1.0 GPM"

  if (count === 1) {
    console.log(`Returning single installation: ${baseGPM}`)
    return baseGPM
  } else {
    const result = `${baseGPM} (${count})`
    console.log(`Returning multiple installations: ${result}`)
    return result
  }
}

/**
 * Formats a note with proper sentence case
 */
export const formatNote = (note: string): string => {
  if (!note) return ""

  const sentences = note.split(".")

  return (
    sentences
      .map((sentence) => {
        const trimmed = sentence.trim()
        if (!trimmed) return ""
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
      })
      .filter((s) => s)
      .join(". ") + (note.endsWith(".") ? "." : "")
  )
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getAeratorDescription with count instead
 */
export const isAeratorInstalled = (value: string): boolean => {
  if (!value) return false

  const lowerValue = value.toLowerCase().trim()

  return (
    lowerValue === "male" ||
    lowerValue === "female" ||
    lowerValue === "insert" ||
    lowerValue.includes("gpm") ||
    lowerValue === "1" ||
    lowerValue === "2" ||
    lowerValue === "yes" ||
    lowerValue === "installed" ||
    lowerValue === "x"
  )
}

// Additional helper functions can be added here
