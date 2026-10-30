import type { Unit } from './types'

// Dates are plain 'YYYY-MM-DD' strings throughout. The math runs in UTC so a
// date never shifts by a day depending on where the code happens to run.

function parse(date: string): Date {
  return new Date(date + 'T00:00:00Z')
}

function format(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

export function addDays(date: string, days: number): string {
  const d = parse(date)
  d.setUTCDate(d.getUTCDate() + days)
  return format(d)
}

export function addMonths(date: string, months: number): string {
  const d = parse(date)
  const total = d.getUTCMonth() + months
  const year = d.getUTCFullYear() + Math.floor(total / 12)
  const month = ((total % 12) + 12) % 12
  const day = Math.min(d.getUTCDate(), daysInMonth(year, month))
  return format(new Date(Date.UTC(year, month, day)))
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000)
}

interface Schedule {
  startsOn: string
  every: number
  unit: Unit
}

// Always counted from the start date, so a monthly task never drifts.
export function occurrence({ startsOn, every, unit }: Schedule, n: number): string {
  switch (unit) {
    case 'day':
      return addDays(startsOn, every * n)
    case 'week':
      return addDays(startsOn, every * 7 * n)
    case 'month':
      return addMonths(startsOn, every * n)
    case 'year':
      return addMonths(startsOn, every * 12 * n)
  }
}

export function nextOn(schedule: Schedule, today: string): string {
  let n = 0
  if (schedule.unit === 'day' || schedule.unit === 'week') {
    const step = schedule.every * (schedule.unit === 'week' ? 7 : 1)
    n = Math.max(0, Math.ceil(daysBetween(schedule.startsOn, today) / step))
  }
  while (occurrence(schedule, n) < today) n++
  return occurrence(schedule, n)
}

export function occurrencesBetween(schedule: Schedule, from: string, to: string): string[] {
  const dates: string[] = []
  let date = nextOn(schedule, from)
  for (let n = 0; date < to && n < 400; n++) {
    dates.push(date)
    date = nextOn(schedule, addDays(date, 1))
  }
  return dates
}

// Calendars skip dates that don't exist (a monthly event on the 31st simply
// doesn't happen in April), so starts that would do that are refused up front.
export function startProblem(startsOn: string, unit: Unit): string | null {
  const day = Number(startsOn.slice(8, 10))
  if (unit === 'month' && day > 28) return 'Pick a day from 1 to 28 so it lands every month.'
  if (unit === 'year' && startsOn.slice(5) === '02-29') return "Pick a day other than Feb 29 so it lands every year."
  return null
}
