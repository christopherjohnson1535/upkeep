import type { Kind, Unit } from '../shared/types'

export interface CommonTask {
  name: string
  kind: Kind
  every: number
  unit: Unit
  remindDays?: number
  miles?: number
}

// Starting points, not rules. Everything here can be edited once it's added.
export const COMMON_TASKS: CommonTask[] = [
  { name: 'Replace HVAC filter', kind: 'home', every: 3, unit: 'month' },
  { name: 'Test smoke and CO detectors', kind: 'home', every: 6, unit: 'month' },
  { name: 'Service furnace', kind: 'home', every: 1, unit: 'year', remindDays: 14 },
  { name: 'Service air conditioner', kind: 'home', every: 1, unit: 'year', remindDays: 14 },
  { name: 'Flush water heater', kind: 'home', every: 1, unit: 'year', remindDays: 14 },
  { name: 'Clean dryer vent', kind: 'home', every: 1, unit: 'year', remindDays: 14 },
  { name: 'Clean gutters', kind: 'home', every: 6, unit: 'month', remindDays: 14 },
  { name: 'Replace fridge water filter', kind: 'home', every: 6, unit: 'month' },
  { name: 'Vacuum fridge coils', kind: 'home', every: 1, unit: 'year' },
  { name: 'Clean range hood filter', kind: 'home', every: 3, unit: 'month' },
  { name: 'Clean dishwasher filter', kind: 'home', every: 1, unit: 'month', remindDays: 1 },
  { name: 'Test GFCI outlets', kind: 'home', every: 6, unit: 'month' },
  { name: 'Check fire extinguisher', kind: 'home', every: 1, unit: 'year' },
  { name: 'Deep clean kitchen', kind: 'home', every: 3, unit: 'month' },
  { name: 'Deep clean bathrooms', kind: 'home', every: 1, unit: 'month', remindDays: 1 },
  { name: 'Deep clean oven', kind: 'home', every: 6, unit: 'month' },
  { name: 'Wash windows', kind: 'home', every: 6, unit: 'month', remindDays: 14 },
  { name: 'Shampoo carpets', kind: 'home', every: 1, unit: 'year', remindDays: 14 },
  { name: 'Winterize sprinklers', kind: 'home', every: 1, unit: 'year', remindDays: 14 },
  { name: 'Service lawn mower', kind: 'home', every: 1, unit: 'year', remindDays: 14 },

  { name: 'Change oil', kind: 'car', every: 6, unit: 'month', miles: 5000 },
  { name: 'Rotate tires', kind: 'car', every: 6, unit: 'month', miles: 5000 },
  { name: 'Replace engine air filter', kind: 'car', every: 1, unit: 'year', miles: 15000 },
  { name: 'Replace cabin air filter', kind: 'car', every: 1, unit: 'year', miles: 15000 },
  { name: 'Replace wiper blades', kind: 'car', every: 1, unit: 'year' },
  { name: 'Check tire pressure', kind: 'car', every: 1, unit: 'month', remindDays: 0 },
  { name: 'Replace brake fluid', kind: 'car', every: 2, unit: 'year', remindDays: 14, miles: 30000 },
  { name: 'Renew registration', kind: 'car', every: 1, unit: 'year', remindDays: 30 },
]

export function suggestionsFor(kind: Kind, taken: string[]) {
  const have = new Set(taken.map((n) => n.toLowerCase()))
  return COMMON_TASKS.filter((t) => (kind === 'other' || t.kind === kind) && !have.has(t.name.toLowerCase()))
}

export function findCommon(name: string) {
  const key = name.trim().toLowerCase()
  return COMMON_TASKS.find((t) => t.name.toLowerCase() === key)
}
