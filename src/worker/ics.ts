import type { Task, Unit } from '../shared/types'

// Builds an iCalendar feed (RFC 5545). Each task is one all-day event with a
// repeat rule, so the calendar app does the repeating on its own.

const FREQ: Record<Unit, string> = { day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY', year: 'YEARLY' }

function text(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

// Lines over 75 bytes wrap, with the continuation starting with a space.
function fold(line: string) {
  const encoder = new TextEncoder()
  const out: string[] = []
  let current = ''
  let bytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    if (bytes + size > (out.length ? 74 : 75)) {
      out.push(current)
      current = ''
      bytes = 0
    }
    current += char
    bytes += size
  }
  out.push(current)
  return out.join('\r\n ')
}

const date = (d: string) => d.replace(/-/g, '')
const nextDay = (d: string) => new Date(Date.parse(d + 'T00:00:00Z') + 86_400_000).toISOString().slice(0, 10)

// '2026-10-29 21:11:27' as stored by SQLite, in UTC.
const stamp = (sqlTime: string) => sqlTime.replace(/[-:]/g, '').replace(' ', 'T') + 'Z'

// All-day events start at midnight, so "9am, n days before" is midnight minus
// (n - 1) days and 15 hours.
export function alarmTrigger(remindDays: number) {
  if (remindDays <= 0) return 'PT9H'
  if (remindDays === 1) return '-PT15H'
  return `-P${remindDays - 1}DT15H`
}

function description(task: Task) {
  const unit = task.every === 1 ? task.unit : `${task.every} ${task.unit}s`
  const lines = [`Every ${unit}.`]
  if (task.miles) lines.push(`Or every ${task.miles.toLocaleString('en-US')} miles, whichever comes first.`)
  if (task.notes) lines.push('', task.notes)
  return lines.join('\n')
}

function event(task: Task) {
  const rule = `FREQ=${FREQ[task.unit]}${task.every > 1 ? `;INTERVAL=${task.every}` : ''}`
  return [
    'BEGIN:VEVENT',
    `UID:task-${task.id}@upkeep`,
    `DTSTAMP:${stamp(task.updatedAt)}`,
    `DTSTART;VALUE=DATE:${date(task.startsOn)}`,
    `DTEND;VALUE=DATE:${date(nextDay(task.startsOn))}`,
    `RRULE:${rule}`,
    `SUMMARY:${text(task.name)}`,
    `DESCRIPTION:${text(description(task))}`,
    // Show as free, never busy. The second line is the one Outlook reads.
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${text(task.name)}`,
    `TRIGGER:${alarmTrigger(task.remindDays)}`,
    'END:VALARM',
    'END:VEVENT',
  ]
}

export function calendar(name: string, tasks: Task[]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//upkeep//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${text(name)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    ...tasks.flatMap(event),
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}
