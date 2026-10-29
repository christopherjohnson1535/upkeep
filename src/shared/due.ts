import type { Completion, Item, Unit } from './types'

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

// Jan 31 + 1 month is Feb 28 (or 29), not Mar 3.
export function addMonths(date: string, months: number): string {
  const d = parse(date)
  const total = d.getUTCMonth() + months
  const year = d.getUTCFullYear() + Math.floor(total / 12)
  const month = ((total % 12) + 12) % 12
  const day = Math.min(d.getUTCDate(), daysInMonth(year, month))
  return format(new Date(Date.UTC(year, month, day)))
}

export function addInterval(date: string, every: number, unit: Exclude<Unit, 'mile'>): string {
  switch (unit) {
    case 'day':
      return addDays(date, every)
    case 'week':
      return addDays(date, every * 7)
    case 'month':
      return addMonths(date, every)
    case 'year':
      return addMonths(date, every * 12)
  }
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000)
}

export function nextDue(item: Item, last: Completion | null) {
  if (!last) return { dueOn: null, dueMiles: null }

  if (item.unit === 'mile') {
    return {
      dueOn: item.fallbackMonths ? addMonths(last.doneOn, item.fallbackMonths) : null,
      dueMiles: last.odometer != null ? last.odometer + item.every : null,
    }
  }

  return { dueOn: addInterval(last.doneOn, item.every, item.unit), dueMiles: null }
}

export type Status = 'overdue' | 'soon' | 'upcoming' | 'later'

export function status(
  item: { dueOn: string | null; leadDays: number; last: Completion | null },
  today: string,
): Status {
  if (!item.last) return 'overdue'
  if (!item.dueOn) return 'later'
  const days = daysBetween(today, item.dueOn)
  if (days < 0) return 'overdue'
  if (days <= item.leadDays) return 'soon'
  if (days <= 30) return 'upcoming'
  return 'later'
}
