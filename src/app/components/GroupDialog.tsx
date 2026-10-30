import { useEffect, useState } from 'react'
import type { Group, GroupInput, Kind } from '../../shared/types'
import { KINDS, plural } from '../format'
import { Dialog, Field, FormError } from './Dialog'

interface Props {
  open: boolean
  group: Group | null
  groups: Group[]
  copyFrom: number | null
  onClose: () => void
  onSave: (input: GroupInput & { copyFrom: number | null }) => Promise<void>
}

export function GroupDialog({ open, group, groups, copyFrom, onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<Kind>('home')
  const [source, setSource] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const from = groups.find((g) => g.id === copyFrom)
    setName(group?.name ?? '')
    setKind(group?.kind ?? from?.kind ?? 'home')
    setSource(copyFrom ? String(copyFrom) : '')
    setError('')
  }, [open, group, groups, copyFrom])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ name, kind, copyFrom: source ? Number(source) : null })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this group.')
    } finally {
      setSaving(false)
    }
  }

  const sources = groups.filter((g) => g.tasks.length > 0)

  return (
    <Dialog open={open} title={group ? 'Rename group' : 'New group'} onClose={onClose} onSubmit={submit}>
      <Field label="Name" htmlFor="g-name">
        <input
          id="g-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={kind === 'car' ? '2019 Civic' : 'Elm St house'}
        />
      </Field>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm text-muted">Kind</legend>
        <div className="grid grid-cols-3 gap-1 rounded-full border border-rule bg-card p-1">
          {KINDS.map((k) => (
            <label
              key={k.value}
              className="flex h-9 cursor-pointer items-center justify-center rounded-full text-sm text-muted transition-colors has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-ink"
            >
              <input
                type="radio"
                name="g-kind"
                value={k.value}
                checked={kind === k.value}
                onChange={() => setKind(k.value)}
                className="sr-only"
              />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>

      {!group && sources.length > 0 && (
        <Field label="Start with the tasks from" htmlFor="g-copy">
          <select id="g-copy" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Nothing, start empty</option>
            {sources.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({plural(g.tasks.length, 'task')})
              </option>
            ))}
          </select>
        </Field>
      )}

      <FormError message={error} />

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={saving} className="button-primary">
          {group ? 'Save changes' : 'Create group'}
        </button>
        <button type="button" onClick={onClose} className="button-quiet">
          Cancel
        </button>
      </div>
    </Dialog>
  )
}
