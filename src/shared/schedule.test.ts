import { describe, expect, it } from 'vitest'
import { addMonths, nextOn, occurrence, occurrencesBetween, startProblem } from './schedule'

describe('addMonths', () => {
  it('clamps to the end of a shorter month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
  })

  it('rolls over the year', () => {
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15')
  })
})

describe('occurrence', () => {
  const filter = { startsOn: '2026-01-13', every: 3, unit: 'month' as const }

  it('counts from the start date without drifting', () => {
    expect(occurrence(filter, 0)).toBe('2026-01-13')
    expect(occurrence(filter, 4)).toBe('2027-01-13')
    expect(occurrence(filter, 40)).toBe('2036-01-13')
  })

  it('handles weeks and years', () => {
    expect(occurrence({ startsOn: '2026-12-28', every: 2, unit: 'week' }, 1)).toBe('2027-01-11')
    expect(occurrence({ startsOn: '2026-10-15', every: 1, unit: 'year' }, 3)).toBe('2029-10-15')
  })
})

describe('nextOn', () => {
  const gutters = { startsOn: '2026-04-15', every: 6, unit: 'month' as const }

  it('is the start date when that is still ahead', () => {
    expect(nextOn({ ...gutters, startsOn: '2026-11-01' }, '2026-10-30')).toBe('2026-11-01')
  })

  it('finds the next one after today', () => {
    expect(nextOn(gutters, '2026-10-30')).toBe('2027-04-15')
    expect(nextOn(gutters, '2026-10-15')).toBe('2026-10-15')
  })

  it('jumps straight to the right week for long-running weekly tasks', () => {
    expect(nextOn({ startsOn: '2020-01-06', every: 1, unit: 'week' }, '2026-10-30')).toBe('2026-11-02')
  })
})

describe('occurrencesBetween', () => {
  it('lists the dates in a window', () => {
    const filter = { startsOn: '2026-01-13', every: 3, unit: 'month' as const }
    expect(occurrencesBetween(filter, '2026-10-30', '2027-10-30')).toEqual([
      '2027-01-13',
      '2027-04-13',
      '2027-07-13',
      '2027-10-13',
    ])
  })
})

describe('startProblem', () => {
  it('refuses starts a calendar would skip', () => {
    expect(startProblem('2026-01-31', 'month')).toMatch(/1 to 28/)
    expect(startProblem('2028-02-29', 'year')).toMatch(/Feb 29/)
    expect(startProblem('2026-01-31', 'year')).toBeNull()
    expect(startProblem('2026-01-28', 'month')).toBeNull()
  })
})
