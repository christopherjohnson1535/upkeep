import { AnimatePresence, motion } from 'motion/react'
import { nextOn } from '../shared/schedule'
import type { Group, Task } from '../shared/types'
import { YearHeader, YearStrip } from './components/YearStrip'
import { cadence, feedLinks, kindLabel, plural, shortDate, today } from './format'

interface Props {
  group: Group
  back: () => void
  onAddTask: () => void
  onEditTask: (task: Task) => void
  onRename: () => void
  onCopy: () => void
  onNewLink: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
  onCopied: () => void
}

export function GroupPage(props: Props) {
  const { group } = props
  const now = today()
  const tasks = [...group.tasks]
    .map((t) => ({ task: t, next: nextOn(t, now) }))
    .sort((a, b) => a.next.localeCompare(b.next) || a.task.name.localeCompare(b.task.name))

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-3">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            props.back()
          }}
          className="-ml-1 flex items-center gap-1 self-start rounded px-1 text-sm text-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Calendars
        </a>
        <h1 className="text-[32px] leading-[1.1] font-medium tracking-[-0.03em] text-balance sm:text-[40px]">
          {group.name}
        </h1>
        <p className="text-[17px] text-muted">
          {kindLabel(group.kind)}, {plural(group.tasks.length, 'task')}
        </p>
      </section>

      {group.archived ? (
        <section className="flex flex-col items-start gap-4 rounded-2xl border border-rule bg-card p-5">
          <p className="text-pretty">
            This group is archived, so its calendar is empty. You can unsubscribe from it in your calendar app.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={props.onRestore} className="button-secondary">
              Restore
            </button>
            <button onClick={props.onCopy} className="button-secondary">
              Copy to a new group
            </button>
          </div>
        </section>
      ) : (
        <Subscribe group={group} onCopied={props.onCopied} />
      )}

      <section className="flex flex-col gap-3" aria-label="Tasks">
        <div className="flex items-end justify-between gap-4">
          <h2 className="flex items-baseline gap-2 text-sm font-medium">
            Tasks
            <span className="text-faint nums">{group.tasks.length}</span>
          </h2>
          {tasks.length > 0 && (
            <div className="hidden sm:block">
              <YearHeader today={now} />
            </div>
          )}
        </div>

        {tasks.length === 0 ? (
          <p className="border-t border-rule pt-4 text-pretty text-muted">
            No tasks yet. Add the jobs that come around every few months. Common ones are ready to pick.
          </p>
        ) : (
          <ul className="border-t border-rule">
            <AnimatePresence initial={false}>
              {tasks.map(({ task, next }) => (
                <motion.li
                  key={task.id}
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="border-b border-rule"
                >
                  <button
                    type="button"
                    onClick={() => props.onEditTask(task)}
                    className="flex w-full items-center gap-4 rounded py-4 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{task.name}</span>
                      <span className="block text-[13px] text-pretty text-muted nums">
                        {cadence(task.every, task.unit)}
                        {task.miles ? ` or ${task.miles.toLocaleString('en-US')} mi` : ''}, next {shortDate(next, now)}
                      </span>
                    </span>
                    <span className="hidden shrink-0 sm:block">
                      <YearStrip task={task} today={now} />
                    </span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        {!group.archived && (
          <button onClick={props.onAddTask} className="button-primary mt-3 self-start">
            Add task
          </button>
        )}
      </section>

      <section className="border-t border-rule pt-4" aria-label="Group settings">
        <div className="-ml-3 flex flex-wrap">
          <button onClick={props.onRename} className="button-quiet">
            Rename
          </button>
          {!group.archived && (
            <>
              <button onClick={props.onCopy} className="button-quiet">
                Copy to a new group
              </button>
              <button onClick={props.onNewLink} className="button-quiet">
                New calendar link
              </button>
              <button onClick={props.onArchive} className="button-quiet">
                Archive
              </button>
            </>
          )}
          {group.archived && (
            <button onClick={props.onDelete} className="button-quiet text-danger hover:text-danger">
              Delete
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function Subscribe({ group, onCopied }: { group: Group; onCopied: () => void }) {
  const links = feedLinks(group.token)

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-rule bg-card p-5" aria-label="Subscribe">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium">Add it to your calendar</h2>
        <p className="text-sm text-pretty text-muted">
          Subscribe once. Every task repeats there on its own, and changes made here show up within a few hours.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={links.webcal} className="button-primary">
          Apple Calendar
        </a>
        <a href={links.google} target="_blank" rel="noreferrer" className="button-secondary">
          Google Calendar
        </a>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(links.https)
            onCopied()
          }}
          className="button-secondary"
        >
          Copy link
        </button>
      </div>
      <p className="text-[13px] text-pretty text-faint">
        On iPhone, tap Apple Calendar here. Google adds subscriptions from its website, then they show up in the app.
      </p>
    </section>
  )
}
