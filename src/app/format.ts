import { daysBetween } from '../shared/due'
import type { ItemWithDue } from '../shared/types'

export function today() {
  // en-CA formats as YYYY-MM-DD in the browser's own time zone.
  return new Date().toLocaleDateString('en-CA')
}

export function shortDate(date: string, now = today()) {
  const d = new Date(date + 'T12:00:00')
  const sameYear = date.slice(0, 4) === now.slice(0, 4)
  return d.toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', year: 'numeric' })
}

export function miles(n: number) {
  return `${n.toLocaleString('en-US')} mi`
}

const UNIT_WORDS = { day: 'day', week: 'week', month: 'month', year: 'year', mile: 'mile' }

export function cadence(item: ItemWithDue) {
  const unit = UNIT_WORDS[item.unit]
  const every =
    item.every === 1
      ? `Every ${unit}`
      : `Every ${item.unit === 'mile' ? item.every.toLocaleString('en-US') : item.every} ${unit}s`
  return item.unit === 'mile' && item.fallbackMonths ? `${every} or ${item.fallbackMonths} months` : every
}

// The second half of a row's detail line. Mileage items lead with the reading
// to watch for, since that's what you check against the dashboard.
export function lastDone(item: ItemWithDue, now = today()) {
  if (!item.last) return 'never done'
  if (item.dueMiles != null) return `next at ${miles(item.dueMiles)}`
  return `last done ${shortDate(item.last.doneOn, now)}`
}

// What sits on the right of a row: how late, or when.
export function dueLabel(item: ItemWithDue, now = today()) {
  if (!item.last) return 'Now'
  if (!item.dueOn) return item.dueMiles != null ? miles(item.dueMiles) : ''

  const days = daysBetween(now, item.dueOn)
  if (days < -1) return `${-days} days late`
  if (days === -1) return 'Yesterday'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return shortDate(item.dueOn, now)
}

// How far through its interval an item is, 0 to 1. Drives the ring.
export function elapsed(item: ItemWithDue, now = today()) {
  if (!item.last || !item.dueOn) return item.last ? 0 : 1
  const span = daysBetween(item.last.doneOn, item.dueOn)
  if (span <= 0) return 1
  return Math.min(1, Math.max(0, daysBetween(item.last.doneOn, now) / span))
}
