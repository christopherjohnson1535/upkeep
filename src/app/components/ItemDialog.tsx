import { useEffect, useRef, useState } from 'react'
import type { ItemInput, ItemWithDue, Unit } from '../../shared/types'
import { today } from '../format'

export type SaveInput = ItemInput & { lastDone?: { doneOn: string; odometer: number | null } }

interface Props {
  item: ItemWithDue | null
  open: boolean
  categories: string[]
  onClose: () => void
  onSave: (input: SaveInput) => Promise<void>
  onDelete: (item: ItemWithDue) => Promise<void>
}

const UNITS: { value: Unit; label: string }[] = [
  { value: 'day', label: 'days' },
  { value: 'week', label: 'weeks' },
  { value: 'month', label: 'months' },
  { value: 'year', label: 'years' },
  { value: 'mile', label: 'miles' },
]

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

export function ItemDialog({ item, open, categories, onClose, onSave, onDelete }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('home')
  const [every, setEvery] = useState('6')
  const [unit, setUnit] = useState<Unit>('month')
  const [fallback, setFallback] = useState('6')
  const [leadDays, setLeadDays] = useState('7')
  const [notes, setNotes] = useState('')
  const [doneOn, setDoneOn] = useState(today())
  const [odometer, setOdometer] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(item?.name ?? '')
    setCategory(item?.category ?? 'home')
    setEvery(String(item?.every ?? 6))
    setUnit(item?.unit ?? 'month')
    setFallback(String(item?.fallbackMonths ?? 6))
    setLeadDays(String(item?.leadDays ?? 7))
    setNotes(item?.notes ?? '')
    setDoneOn(today())
    setOdometer('')
    setError('')
  }, [open, item])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // "Every 6 miles" is never what anyone means, so swap in a sensible default.
  function changeUnit(next: Unit) {
    const n = Number(every)
    if (next === 'mile' && n < 500) setEvery('5000')
    if (next !== 'mile' && n >= 500) setEvery('6')
    setUnit(next)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const reading = odometer ? Number(odometer.replace(/[^\d]/g, '')) : null
    if (!item && unit === 'mile' && !reading) {
      setError('Enter the odometer reading from the last time this was done.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        name,
        category,
        every: Number(every),
        unit,
        fallbackMonths: unit === 'mile' && fallback ? Number(fallback) : null,
        leadDays: Number(leadDays),
        notes,
        lastDone: item ? undefined : { doneOn, odometer: reading },
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="item-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-paper p-0 text-ink shadow-[0_24px_64px_-24px_rgb(22_25_29/0.4)] open:animate-[dialog-in_200ms_var(--ease-out-quint)]"
    >
      <form onSubmit={submit} className="flex flex-col gap-5 p-6">
        <h2 id="item-dialog-title" className="text-xl font-medium tracking-tight">
          {item ? 'Edit item' : 'Add item'}
        </h2>

        <Field label="Name" htmlFor="f-name">
          <input
            id="f-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Replace furnace filter"
          />
        </Field>

        <Field label="Category" htmlFor="f-category">
          <input
            id="f-category"
            list="f-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="f-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <div className="flex flex-col gap-1.5">
          <span id="f-repeat" className="text-sm text-muted">
            Repeats every
          </span>
          <div className="flex gap-2" role="group" aria-labelledby="f-repeat">
            <input
              aria-label="Interval"
              required
              inputMode="numeric"
              value={every}
              onChange={(e) => setEvery(e.target.value.replace(/[^\d]/g, ''))}
              className="w-28 nums"
            />
            <select aria-label="Unit" value={unit} onChange={(e) => changeUnit(e.target.value as Unit)} className="flex-1">
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {unit === 'mile' && (
          <Field label="Or after this many months, whichever comes first" htmlFor="f-fallback">
            <input
              id="f-fallback"
              inputMode="numeric"
              value={fallback}
              onChange={(e) => setFallback(e.target.value.replace(/[^\d]/g, ''))}
              className="w-28 nums"
            />
          </Field>
        )}

        {!item && (
          <div className="flex gap-3">
            <Field label="Last done" htmlFor="f-done">
              <input id="f-done" type="date" required value={doneOn} max={today()} onChange={(e) => setDoneOn(e.target.value)} />
            </Field>
            {unit === 'mile' && (
              <Field label="Odometer then" htmlFor="f-odo">
                <input
                  id="f-odo"
                  inputMode="numeric"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="48,200"
                  className="w-full nums"
                />
              </Field>
            )}
          </div>
        )}

        <Field label="Remind me this many days ahead" htmlFor="f-lead">
          <input
            id="f-lead"
            inputMode="numeric"
            value={leadDays}
            onChange={(e) => setLeadDays(e.target.value.replace(/[^\d]/g, ''))}
            className="w-28 nums"
          />
        </Field>

        <Field label="Notes" htmlFor="f-notes">
          <textarea
            id="f-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Filter size 16x25x1"
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-overdue">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-full bg-ink px-5 text-sm font-medium text-paper disabled:opacity-60"
          >
            {item ? 'Save changes' : 'Add item'}
          </button>
          <button type="button" onClick={onClose} className="h-11 px-3 text-sm text-muted hover:text-ink">
            Cancel
          </button>
          {item && (
            <button
              type="button"
              onClick={async () => {
                if (confirm(`Delete ${item.name} and its history?`)) {
                  await onDelete(item)
                  onClose()
                }
              }}
              className="ml-auto h-11 px-3 text-sm text-overdue hover:underline"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </dialog>
  )
}
