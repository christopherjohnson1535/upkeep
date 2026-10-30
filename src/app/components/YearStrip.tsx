import { addMonths, occurrencesBetween } from '../../shared/schedule'
import type { Task } from '../../shared/types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function window12(today: string) {
  const start = today.slice(0, 8) + '01'
  return Array.from({ length: 12 }, (_, i) => addMonths(start, i).slice(0, 7))
}

const monthName = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1]

// The next twelve months, with a mark in each month the task lands in. Reading
// down the list shows how the year's work spreads out.
export function YearStrip({ task, today }: { task: Task; today: string }) {
  const months = window12(today)
  const end = addMonths(months[0] + '-01', 12)
  const hit = new Set(occurrencesBetween(task, months[0] + '-01', end).map((d) => d.slice(0, 7)))
  const landing = months.filter((m) => hit.has(m)).map(monthName)

  return (
    <div role="img" aria-label={`In the next year: ${landing.join(', ') || 'none'}`} className="flex gap-1">
      {months.map((m) => (
        <span key={m} className={`h-4 w-2 rounded-[2px] ${hit.has(m) ? 'bg-ink' : 'bg-rule'}`} />
      ))}
    </div>
  )
}

export function YearHeader({ today }: { today: string }) {
  return (
    <div aria-hidden="true" className="flex gap-1 text-[10px] leading-none text-faint">
      {window12(today).map((m) => (
        <span key={m} className="flex w-2 justify-center">
          {monthName(m)[0]}
        </span>
      ))}
    </div>
  )
}
