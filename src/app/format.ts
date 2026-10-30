import type { Kind, Unit } from '../shared/types'

export function today() {
  // en-CA formats as YYYY-MM-DD in the browser's own time zone.
  return new Date().toLocaleDateString('en-CA')
}

export function shortDate(date: string, now = today()) {
  const d = new Date(date + 'T12:00:00')
  const sameYear = date.slice(0, 4) === now.slice(0, 4)
  return d.toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' })
}

export function cadence(every: number, unit: Unit) {
  return every === 1 ? `Every ${unit}` : `Every ${every} ${unit}s`
}

export const KINDS: { value: Kind; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'car', label: 'Car' },
  { value: 'other', label: 'Other' },
]

export const kindLabel = (kind: Kind) => KINDS.find((k) => k.value === kind)!.label

export const REMINDERS = [
  { days: 0, label: 'On the day' },
  { days: 1, label: '1 day before' },
  { days: 3, label: '3 days before' },
  { days: 7, label: '1 week before' },
  { days: 14, label: '2 weeks before' },
  { days: 30, label: '30 days before' },
]

export function feedLinks(token: string) {
  const https = `${location.origin}/feed/${token}.ics`
  const webcal = https.replace(/^https?:/, 'webcal:')
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
  }
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
