import { describe, expect, it } from 'vitest'
import type { Task } from '../shared/types'
import { alarmTrigger, calendar } from './ics'

const task = (over: Partial<Task> = {}): Task => ({
  id: 7,
  groupId: 1,
  name: 'Replace HVAC filter',
  every: 3,
  unit: 'month',
  startsOn: '2027-01-13',
  remindDays: 7,
  miles: null,
  notes: null,
  updatedAt: '2026-10-29 21:11:27',
  ...over,
})

const unfold = (ics: string) => ics.replace(/\r\n /g, '')

describe('calendar', () => {
  it('turns a task into a repeating all-day event', () => {
    const ics = calendar('House on Elm', [task()])
    expect(ics).toContain('X-WR-CALNAME:House on Elm\r\n')
    expect(ics).toContain('UID:task-7@upkeep\r\n')
    expect(ics).toContain('DTSTART;VALUE=DATE:20270113\r\n')
    expect(ics).toContain('DTEND;VALUE=DATE:20270114\r\n')
    expect(ics).toContain('RRULE:FREQ=MONTHLY;INTERVAL=3\r\n')
    expect(ics).toContain('DTSTAMP:20261029T211127Z\r\n')
    expect(ics).toContain('TRIGGER:-P6DT15H\r\n')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('leaves out INTERVAL for every-one rules', () => {
    expect(calendar('Car', [task({ every: 1, unit: 'year' })])).toContain('RRULE:FREQ=YEARLY\r\n')
  })

  it('escapes text and keeps the mileage rule in the notes', () => {
    const ics = unfold(calendar('Car', [task({ name: 'Oil, filter; check', miles: 5000, notes: 'Use 0W-20' })]))
    expect(ics).toContain('SUMMARY:Oil\\, filter\\; check\r\n')
    expect(ics).toContain('Or every 5\\,000 miles\\, whichever comes first.\\n\\nUse 0W-20')
  })

  it('folds long lines at 75 bytes', () => {
    const ics = calendar('Home', [task({ notes: 'x'.repeat(200) })])
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    expect(unfold(ics)).toContain('x'.repeat(200))
  })

  it('is an empty calendar for an archived group', () => {
    expect(calendar('Old house', [])).not.toContain('BEGIN:VEVENT')
  })
})

describe('alarmTrigger', () => {
  it('fires at 9am on the right day', () => {
    expect(alarmTrigger(0)).toBe('PT9H')
    expect(alarmTrigger(1)).toBe('-PT15H')
    expect(alarmTrigger(3)).toBe('-P2DT15H')
  })
})
