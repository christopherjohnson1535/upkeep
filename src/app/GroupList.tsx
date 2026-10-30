import { nextOn } from '../shared/schedule'
import type { Group } from '../shared/types'
import { kindLabel, plural, shortDate, today } from './format'

interface Props {
  groups: Group[]
  open: (group: Group) => void
  onNew: () => void
}

function nextUp(group: Group, now: string) {
  const next = group.tasks
    .map((t) => ({ name: t.name, on: nextOn(t, now) }))
    .sort((a, b) => a.on.localeCompare(b.on))[0]
  return next ? `Next up: ${next.name}, ${shortDate(next.on, now)}` : 'No tasks yet'
}

export function GroupList({ groups, open, onNew }: Props) {
  const now = today()
  const active = groups.filter((g) => !g.archived)
  const archived = groups.filter((g) => g.archived)

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-3">
        <h1 className="text-[32px] leading-[1.1] font-medium tracking-[-0.03em] sm:text-[40px]">Calendars</h1>
        <p className="max-w-md text-[17px] text-pretty text-muted">
          {active.length
            ? 'Each group is its own calendar. Subscribe once and the tasks repeat there on their own.'
            : 'Make a group for your house or car, add the jobs that come around every few months, then subscribe to it from your calendar.'}
        </p>
      </section>

      {active.length > 0 && (
        <ul className="border-t border-rule">
          {active.map((g) => (
            <li key={g.id} className="border-b border-rule">
              <a
                href={`/g/${g.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  open(g)
                }}
                className="group flex items-center gap-4 rounded py-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-medium tracking-tight">{g.name}</span>
                  <span className="block text-sm text-pretty text-muted">
                    {kindLabel(g.kind)}, {plural(g.tasks.length, 'task')}. {nextUp(g, now)}
                  </span>
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className="size-5 shrink-0 text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      )}

      <button onClick={onNew} className="button-primary self-start">
        New group
      </button>

      {archived.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="Archived">
          <h2 className="flex items-baseline gap-2 text-sm font-medium text-muted">
            Archived
            <span className="text-faint nums">{archived.length}</span>
          </h2>
          <ul className="border-t border-rule">
            {archived.map((g) => (
              <li key={g.id} className="border-b border-rule">
                <a
                  href={`/g/${g.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    open(g)
                  }}
                  className="flex items-baseline justify-between gap-4 rounded py-3 text-muted hover:text-ink"
                >
                  <span className="truncate">{g.name}</span>
                  <span className="shrink-0 text-sm text-faint">{plural(g.tasks.length, 'task')}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
