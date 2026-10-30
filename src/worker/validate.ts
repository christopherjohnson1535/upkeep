import { startProblem } from '../shared/schedule'
import type { GroupInput, Kind, TaskInput, Unit } from '../shared/types'

const UNITS: Unit[] = ['day', 'week', 'month', 'year']
const KINDS: Kind[] = ['home', 'car', 'other']
const DATE = /^\d{4}-\d{2}-\d{2}$/

const trimmed = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const whole = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max

export function parseGroup(body: any): GroupInput | null {
  const name = trimmed(body?.name, 80)
  if (!name || !KINDS.includes(body.kind)) return null
  return { name, kind: body.kind }
}

export function parseTask(body: any): TaskInput | string {
  const name = trimmed(body?.name, 120)
  if (!name) return 'Give the task a name.'
  if (!whole(body.every, 1, 999) || !UNITS.includes(body.unit)) return 'Set how often it repeats.'
  if (typeof body.startsOn !== 'string' || !DATE.test(body.startsOn)) return 'Pick the next date.'
  const problem = startProblem(body.startsOn, body.unit)
  if (problem) return problem
  if (!whole(body.remindDays, 0, 365)) return 'Reminder days must be between 0 and 365.'
  if (body.miles != null && !whole(body.miles, 1, 1_000_000)) return 'Miles must be a whole number.'
  return {
    name,
    every: body.every,
    unit: body.unit,
    startsOn: body.startsOn,
    remindDays: body.remindDays,
    miles: body.miles ?? null,
    notes: trimmed(body.notes, 2000),
  }
}
