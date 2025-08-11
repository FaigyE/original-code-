export interface CustomerInfo {
  customerName: string
  propertyName: string
  address: string
  city: string
  state: string
  zip: string
  date: string
}

export interface InstallationData {
  Unit: string
  [key: string]: string | number | undefined
}

export interface Note {
  unit: string
  note: string
}

export interface ConsolidatedUnit {
  unit: string
  kitchenAeratorCount: number
  bathroomAeratorCount: number
  showerHeadCount: number
  notes?: string
}
