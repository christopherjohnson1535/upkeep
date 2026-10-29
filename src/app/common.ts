import type { Unit } from '../shared/types'

export interface CommonTask {
  name: string
  category: string
  every: number
  unit: Unit
  fallbackMonths?: number
  leadDays?: number
}

// Starting points, not rules. Everything here can be edited once it's added.
export const COMMON_TASKS: CommonTask[] = [
  { name: 'Replace HVAC filter', category: 'home', every: 3, unit: 'month' },
  { name: 'Test smoke and CO detectors', category: 'home', every: 6, unit: 'month' },
  { name: 'Service furnace', category: 'home', every: 1, unit: 'year', leadDays: 21 },
  { name: 'Service air conditioner', category: 'home', every: 1, unit: 'year', leadDays: 21 },
  { name: 'Flush water heater', category: 'home', every: 1, unit: 'year', leadDays: 14 },
  { name: 'Clean dryer vent', category: 'home', every: 1, unit: 'year', leadDays: 14 },
  { name: 'Replace fridge water filter', category: 'home', every: 6, unit: 'month' },
  { name: 'Vacuum fridge coils', category: 'home', every: 1, unit: 'year' },
  { name: 'Clean range hood filter', category: 'home', every: 3, unit: 'month' },
  { name: 'Clean dishwasher filter', category: 'home', every: 1, unit: 'month', leadDays: 3 },
  { name: 'Test GFCI outlets', category: 'home', every: 6, unit: 'month' },
  { name: 'Check fire extinguisher', category: 'home', every: 1, unit: 'year' },
  { name: 'Deep clean kitchen', category: 'home', every: 3, unit: 'month' },
  { name: 'Deep clean bathrooms', category: 'home', every: 1, unit: 'month', leadDays: 3 },
  { name: 'Deep clean oven', category: 'home', every: 6, unit: 'month' },
  { name: 'Wash windows', category: 'home', every: 6, unit: 'month', leadDays: 14 },
  { name: 'Shampoo carpets', category: 'home', every: 1, unit: 'year', leadDays: 14 },

  { name: 'Clean gutters', category: 'yard', every: 6, unit: 'month', leadDays: 14 },
  { name: 'Winterize sprinklers', category: 'yard', every: 1, unit: 'year', leadDays: 14 },
  { name: 'Service lawn mower', category: 'yard', every: 1, unit: 'year', leadDays: 14 },

  { name: 'Change oil', category: 'car', every: 5000, unit: 'mile', fallbackMonths: 6 },
  { name: 'Rotate tires', category: 'car', every: 5000, unit: 'mile', fallbackMonths: 6 },
  { name: 'Replace engine air filter', category: 'car', every: 15000, unit: 'mile', fallbackMonths: 12 },
  { name: 'Replace cabin air filter', category: 'car', every: 15000, unit: 'mile', fallbackMonths: 12 },
  { name: 'Replace wiper blades', category: 'car', every: 1, unit: 'year' },
  { name: 'Check tire pressure', category: 'car', every: 1, unit: 'month', leadDays: 3 },
  { name: 'Replace brake fluid', category: 'car', every: 2, unit: 'year', leadDays: 14 },
]

export function findCommon(name: string) {
  const key = name.trim().toLowerCase()
  return COMMON_TASKS.find((t) => t.name.toLowerCase() === key)
}
