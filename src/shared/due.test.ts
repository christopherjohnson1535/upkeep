import { describe, expect, it } from 'vitest'
import { addMonths, addInterval, daysBetween, nextDue, status } from './due'
import type { Item } from './types'

const item = (over: Partial<Item> = {}): Item => ({
  id: 1,
  name: 'Change oil',
  category: 'car',
  every: 6,
  unit: 'month',
  fallbackMonths: null,
  leadDays: 7,
  notes: null,
  ...over,
})

const done = (doneOn: string, odometer: number | null = null) => ({
  id: 1,
  doneOn,
  odometer,
  note: null,
})

describe('addMonths', () => {
  it('clamps to the end of a shorter month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28')
  })

  it('rolls over the year', () => {
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15')
  })

  it('handles a leap day plus a year', () => {
    expect(addInterval('2028-02-29', 1, 'year')).toBe('2029-02-28')
  })
})

describe('addInterval', () => {
  it('adds days and weeks', () => {
    expect(addInterval('2026-12-28', 7, 'day')).toBe('2027-01-04')
    expect(addInterval('2026-10-29', 2, 'week')).toBe('2026-11-12')
  })
})

describe('nextDue', () => {
  it('is unknown until the item has been done once', () => {
    expect(nextDue(item(), null)).toEqual({ dueOn: null, dueMiles: null })
  })

  it('rolls forward from the last completion', () => {
    expect(nextDue(item(), done('2026-05-03')).dueOn).toBe('2026-11-03')
  })

  it('tracks mileage and the time fallback together', () => {
    const tires = item({ name: 'Rotate tires', every: 5000, unit: 'mile', fallbackMonths: 6 })
    expect(nextDue(tires, done('2026-04-12', 48_200))).toEqual({
      dueOn: '2026-10-12',
      dueMiles: 53_200,
    })
  })

  it('has no date for a mileage item without a fallback', () => {
    const belt = item({ every: 60_000, unit: 'mile' })
    expect(nextDue(belt, done('2026-04-12', 48_200))).toEqual({ dueOn: null, dueMiles: 108_200 })
  })
})

describe('status', () => {
  const today = '2026-10-29'
  const at = (dueOn: string | null) => ({ dueOn, leadDays: 7, last: done('2026-01-01') })

  it('sorts by distance from today', () => {
    expect(status(at('2026-10-28'), today)).toBe('overdue')
    expect(status(at('2026-10-29'), today)).toBe('soon')
    expect(status(at('2026-11-05'), today)).toBe('soon')
    expect(status(at('2026-11-06'), today)).toBe('upcoming')
    expect(status(at('2026-12-15'), today)).toBe('later')
  })

  it('treats never-done items as overdue', () => {
    expect(status({ dueOn: null, leadDays: 7, last: null }, today)).toBe('overdue')
  })

  it('counts days across a month boundary', () => {
    expect(daysBetween('2026-10-29', '2026-11-03')).toBe(5)
  })
})
