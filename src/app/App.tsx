import { LayoutGroup, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { daysBetween, status, type Status } from '../shared/due'
import type { ItemWithDue } from '../shared/types'
import { api } from './api'
import { ItemDialog, type SaveInput } from './components/ItemDialog'
import { ItemRow } from './components/ItemRow'
import { Toast, type ToastMessage } from './components/Toast'
import { today } from './format'

type View = 'next' | 'all'

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
const count = (n: number) => WORDS[n] ?? String(n)

function byDue(a: ItemWithDue, b: ItemWithDue) {
  if (!a.last !== !b.last) return a.last ? 1 : -1
  if (a.dueOn && b.dueOn) return a.dueOn.localeCompare(b.dueOn)
  if (a.dueOn !== b.dueOn) return a.dueOn ? -1 : 1
  return a.name.localeCompare(b.name)
}

function viewFromPath(): View {
  return location.pathname.startsWith('/all') ? 'all' : 'next'
}

export function App() {
  const [items, setItems] = useState<ItemWithDue[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [view, setView] = useState<View>(viewFromPath)
  const [editing, setEditing] = useState<ItemWithDue | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const now = today()
  const dismissToast = useCallback(() => setToast(null), [])

  const load = useCallback(() => {
    setLoadError('')
    api.items().then(setItems, (err: Error) => setLoadError(err.message))
  }, [])

  useEffect(load, [load])

  useEffect(() => {
    const onPop = () => setView(viewFromPath())
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  function go(next: View) {
    history.pushState(null, '', next === 'all' ? '/all' : '/')
    setView(next)
  }

  function replace(item: ItemWithDue) {
    setItems((list) => list && (list.some((i) => i.id === item.id) ? list.map((i) => (i.id === item.id ? item : i)) : [...list, item]))
  }

  async function markDone(item: ItemWithDue, odometer?: number) {
    const { completionId, item: updated } = await api.done(item.id, { doneOn: now, odometer: odometer ?? null })
    replace(updated)
    setToast({
      id: Date.now(),
      text: `Marked ${item.name} done`,
      action: {
        label: 'Undo',
        run: async () => {
          await api.undo(completionId)
          replace(item)
        },
      },
    })
  }

  async function save(input: SaveInput) {
    if (editing) {
      replace(await api.update(editing.id, input))
    } else {
      const { lastDone, ...rest } = input
      replace(await api.create({ ...rest, lastDone: lastDone! }))
    }
  }

  async function remove(item: ItemWithDue) {
    await api.remove(item.id)
    setItems((list) => list && list.filter((i) => i.id !== item.id))
    setToast({ id: Date.now(), text: `Deleted ${item.name}` })
  }

  function openDialog(item: ItemWithDue | null) {
    setEditing(item)
    setDialogOpen(true)
  }

  const withStatus = useMemo(
    () => (items ?? []).map((item) => ({ item, status: status(item, now) })).sort((a, b) => byDue(a.item, b.item)),
    [items, now],
  )

  const pick = (s: Status) => withStatus.filter((x) => x.status === s)
  const overdue = pick('overdue')
  const soon = pick('soon')
  const upcoming = pick('upcoming')
  const later = pick('later')
  const recent = later.filter((x) => x.item.last && daysBetween(x.item.last.doneOn, now) <= 7)
  const quietCount = later.length - recent.length
  const categories = [...new Set((items ?? []).map((i) => i.category))].sort()

  const rowProps = { onDone: markDone, onEdit: openDialog }

  return (
    <div className="mx-auto flex min-h-dvh max-w-160 flex-col px-5 pt-8 pb-32 sm:px-6 sm:pt-12">
      <header className="flex items-baseline justify-between">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            go('next')
          }}
          className="rounded text-[15px] font-semibold tracking-tight"
        >
          upkeep
        </a>
        <nav className="flex gap-1 text-sm" aria-label="Views">
          {(
            [
              ['next', 'Up next', '/'],
              ['all', 'All items', '/all'],
            ] as const
          ).map(([key, label, href]) => (
            <a
              key={key}
              href={href}
              aria-current={view === key ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault()
                go(key)
              }}
              className="rounded-full px-3 py-1.5 text-muted transition-colors hover:text-ink aria-[current=page]:bg-ink/[0.06] aria-[current=page]:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main className="mt-12 flex flex-col gap-12 sm:mt-16">
        {loadError ? (
          <section className="flex flex-col items-start gap-4">
            <h1 className="text-3xl font-medium tracking-tight">Couldn't load your items.</h1>
            <p className="text-muted">{loadError}</p>
            <button onClick={load} className="h-11 rounded-full border border-ink px-5 text-sm font-medium">
              Try again
            </button>
          </section>
        ) : items === null ? null : items.length === 0 ? (
          <section className="flex flex-col items-start gap-4">
            <h1 className="text-[32px] leading-tight font-medium tracking-tight sm:text-[40px]">Nothing to keep track of yet.</h1>
            <p className="max-w-md text-muted">
              Add the first thing you keep forgetting. Common ones like the furnace filter and the oil change are
              ready to pick, so all you set is when it was last done.
            </p>
            <button
              onClick={() => openDialog(null)}
              className="mt-2 h-11 rounded-full bg-ink px-5 text-sm font-medium text-paper"
            >
              Add item
            </button>
          </section>
        ) : view === 'next' ? (
          <LayoutGroup>
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-2"
            >
              <p className="text-sm text-muted">
                {new Date(now + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-[32px] leading-[1.1] font-medium tracking-[-0.03em] text-balance sm:text-[40px]">
                {overdue.length
                  ? `${count(overdue.length)} ${overdue.length === 1 ? 'thing is' : 'things are'} overdue.`
                  : 'All caught up.'}
              </h1>
              <p className="text-[17px] text-muted">
                {soon.length + upcoming.length === 0
                  ? `Nothing ${overdue.length ? 'else ' : ''}due in the next 30 days.`
                  : `${count(soon.length + upcoming.length)}${overdue.length ? ' more' : ''} due in the next 30 days.`}
              </p>
            </motion.section>

            <Group title="Overdue" rows={overdue} {...rowProps} />
            <Group title="Due soon" rows={soon} {...rowProps} />
            <Group title="Next 30 days" rows={upcoming} {...rowProps} />
            <Group title="Done this week" rows={recent} recentlyDone {...rowProps} />

            {quietCount > 0 && (
              <p className="text-sm text-muted">
                {count(quietCount)} more {quietCount === 1 ? "isn't" : "aren't"} due for a while.{' '}
                <a
                  href="/all"
                  onClick={(e) => {
                    e.preventDefault()
                    go('all')
                  }}
                  className="rounded text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
                >
                  See all items
                </a>
              </p>
            )}
          </LayoutGroup>
        ) : (
          <LayoutGroup>
            <h1 className="text-[32px] leading-[1.1] font-medium tracking-[-0.03em] sm:text-[40px]">All items</h1>
            {categories.map((c) => (
              <Group
                key={c}
                title={c[0].toUpperCase() + c.slice(1)}
                rows={withStatus.filter((x) => x.item.category === c)}
                {...rowProps}
              />
            ))}
          </LayoutGroup>
        )}

        {items && items.length > 0 && (
          <button
            onClick={() => openDialog(null)}
            className="hidden h-11 self-start rounded-full bg-ink px-5 text-sm font-medium text-paper transition-transform active:scale-[0.97] sm:block"
          >
            Add item
          </button>
        )}
      </main>

      {items && items.length > 0 && (
        <button
          onClick={() => openDialog(null)}
          aria-label="Add item"
          className="fixed right-5 bottom-6 grid size-14 place-items-center rounded-full bg-ink text-paper shadow-[0_8px_24px_-8px_rgb(22_25_29/0.5)] transition-transform active:scale-95 sm:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      <ItemDialog
        item={editing}
        open={dialogOpen}
        categories={categories}
        tracked={(items ?? []).map((i) => i.name.toLowerCase())}
        onClose={() => setDialogOpen(false)}
        onSave={save}
        onDelete={remove}
      />
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}

interface GroupProps {
  title: string
  rows: { item: ItemWithDue; status: Status }[]
  recentlyDone?: boolean
  onDone: (item: ItemWithDue, odometer?: number) => Promise<void>
  onEdit: (item: ItemWithDue) => void
}

function Group({ title, rows, recentlyDone, onDone, onEdit }: GroupProps) {
  if (rows.length === 0) return null
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h2 className="flex items-baseline gap-2 text-sm font-medium">
        {title}
        <span className="text-faint nums">{rows.length}</span>
      </h2>
      <ul className="border-t border-rule">
        {rows.map(({ item, status }) => (
          <ItemRow key={item.id} item={item} status={status} recentlyDone={recentlyDone} onDone={onDone} onEdit={onEdit} />
        ))}
      </ul>
    </section>
  )
}
