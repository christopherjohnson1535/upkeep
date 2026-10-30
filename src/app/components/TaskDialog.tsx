import { useEffect, useState } from 'react'
import { startProblem } from '../../shared/schedule'
import type { Kind, Task, TaskInput, Unit } from '../../shared/types'
import { findCommon, suggestionsFor, type CommonTask } from '../common'
import { REMINDERS, today } from '../format'
import { Dialog, Field, FormError } from './Dialog'

interface Props {
  open: boolean
  task: Task | null
  kind: Kind
  taken: string[]
  onClose: () => void
  onSave: (input: TaskInput) => Promise<void>
  onDelete: (task: Task) => Promise<void>
}

const UNITS: { value: Unit; label: string }[] = [
  { value: 'day', label: 'days' },
  { value: 'week', label: 'weeks' },
  { value: 'month', label: 'months' },
  { value: 'year', label: 'years' },
]

const digits = (v: string) => v.replace(/[^\d]/g, '')

export function TaskDialog({ open, task, kind, taken, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState('')
  const [every, setEvery] = useState('3')
  const [unit, setUnit] = useState<Unit>('month')
  const [startsOn, setStartsOn] = useState(today())
  const [remindDays, setRemindDays] = useState(7)
  const [miles, setMiles] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(task?.name ?? '')
    setEvery(String(task?.every ?? 3))
    setUnit(task?.unit ?? 'month')
    setStartsOn(task?.startsOn ?? today())
    setRemindDays(task?.remindDays ?? 7)
    setMiles(task?.miles ? String(task.miles) : '')
    setNotes(task?.notes ?? '')
    setError('')
  }, [open, task])

  function applyCommon(common: CommonTask) {
    setName(common.name)
    setEvery(String(common.every))
    setUnit(common.unit)
    setRemindDays(common.remindDays ?? 7)
    setMiles(common.miles ? String(common.miles) : '')
  }

  function changeName(value: string) {
    setName(value)
    const common = !task && findCommon(value)
    if (common) applyCommon(common)
  }

  const suggestions = task ? [] : suggestionsFor(kind, taken)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const problem = startProblem(startsOn, unit)
    if (problem) return setError(problem)

    setSaving(true)
    setError('')
    try {
      await onSave({
        name,
        every: Number(every),
        unit,
        startsOn,
        remindDays,
        miles: miles ? Number(miles) : null,
        notes: notes || null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this task.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} title={task ? 'Edit task' : 'Add task'} onClose={onClose} onSubmit={submit}>
      <Field label="Name" htmlFor="t-name">
        <input
          id="t-name"
          required
          list={task ? undefined : 't-common'}
          value={name}
          onChange={(e) => changeName(e.target.value)}
          placeholder="Replace furnace filter"
        />
        {!task && (
          <datalist id="t-common">
            {suggestions.map((t) => (
              <option key={t.name} value={t.name} />
            ))}
          </datalist>
        )}
      </Field>

      {!name && suggestions.length > 0 && (
        <div className="-mt-2 flex flex-wrap gap-2" aria-label="Common tasks">
          {suggestions.slice(0, 6).map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => applyCommon(t)}
              className="h-8 rounded-full border border-rule bg-card px-3 text-[13px] text-muted transition-colors hover:border-ink hover:text-ink"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span id="t-repeat" className="text-sm text-muted">
          Repeats every
        </span>
        <div className="flex gap-2" role="group" aria-labelledby="t-repeat">
          <input
            aria-label="Interval"
            required
            inputMode="numeric"
            value={every}
            onChange={(e) => setEvery(digits(e.target.value))}
            className="w-24 nums"
          />
          <select aria-label="Unit" value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className="flex-1">
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Next one on" htmlFor="t-start">
          <input id="t-start" type="date" required value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </Field>
        <Field label="Remind me" htmlFor="t-remind">
          <select id="t-remind" value={remindDays} onChange={(e) => setRemindDays(Number(e.target.value))}>
            {REMINDERS.map((r) => (
              <option key={r.days} value={r.days}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {(kind === 'car' || miles) && (
        <Field label="Or every this many miles (shown in the event)" htmlFor="t-miles">
          <input
            id="t-miles"
            inputMode="numeric"
            value={miles ? Number(miles).toLocaleString('en-US') : ''}
            onChange={(e) => setMiles(digits(e.target.value))}
            placeholder="5,000"
            className="w-32 nums"
          />
        </Field>
      )}

      <Field label="Notes" htmlFor="t-notes">
        <textarea
          id="t-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Filter size 16x25x1"
        />
      </Field>

      <FormError message={error} />

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={saving} className="button-primary">
          {task ? 'Save changes' : 'Add task'}
        </button>
        <button type="button" onClick={onClose} className="button-quiet">
          Cancel
        </button>
        {task && (
          <button
            type="button"
            onClick={async () => {
              if (confirm(`Delete ${task.name}? It disappears from the calendar too.`)) {
                await onDelete(task)
                onClose()
              }
            }}
            className="button-quiet ml-auto text-danger hover:text-danger"
          >
            Delete
          </button>
        )}
      </div>
    </Dialog>
  )
}
