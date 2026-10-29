export type Unit = 'day' | 'week' | 'month' | 'year' | 'mile'

export interface Item {
  id: number
  name: string
  category: string
  every: number
  unit: Unit
  fallbackMonths: number | null
  leadDays: number
  notes: string | null
}

export interface Completion {
  id: number
  doneOn: string
  odometer: number | null
  note: string | null
}

export interface ItemWithDue extends Item {
  last: Completion | null
  dueOn: string | null
  dueMiles: number | null
}

export interface ItemInput {
  name: string
  category: string
  every: number
  unit: Unit
  fallbackMonths?: number | null
  leadDays?: number
  notes?: string | null
}

export interface CompletionInput {
  doneOn: string
  odometer?: number | null
  note?: string | null
}
