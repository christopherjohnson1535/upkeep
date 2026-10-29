import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import type { Status } from '../../shared/due'
import type { ItemWithDue } from '../../shared/types'
import { cadence, dueLabel, elapsed, lastDone } from '../format'
import { DueRing } from './DueRing'

interface Props {
  item: ItemWithDue
  status: Status
  recentlyDone?: boolean
  onDone: (item: ItemWithDue, odometer?: number) => Promise<void>
  onEdit: (item: ItemWithDue) => void
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function ItemRow({ item, status, recentlyDone = false, onDone, onEdit }: Props) {
  const [completing, setCompleting] = useState(false)
  const [askOdometer, setAskOdometer] = useState(false)
  const [odometer, setOdometer] = useState('')

  const tone = status === 'overdue' ? 'overdue' : status === 'soon' ? 'soon' : 'normal'
  const done = completing || recentlyDone

  async function complete(reading?: number) {
    setCompleting(true)
    setAskOdometer(false)
    try {
      // Let the check finish drawing before the row moves to Done.
      await Promise.all([onDone(item, reading), wait(650)])
    } finally {
      setCompleting(false)
    }
  }

  function tap() {
    if (item.unit === 'mile') setAskOdometer((open) => !open)
    else complete()
  }

  function submitOdometer(e: React.FormEvent) {
    e.preventDefault()
    const reading = Number(odometer.replace(/[^\d]/g, ''))
    if (reading > 0) complete(reading)
  }

  const minReading = item.last?.odometer ?? 0

  return (
    <motion.li
      layout="position"
      layoutId={`item-${item.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: recentlyDone ? 0.55 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="border-b border-rule"
    >
      <div className="flex items-center gap-4 py-4">
        <DueRing
          progress={elapsed(item)}
          tone={tone}
          done={done}
          label={done ? `${item.name} done` : `Mark ${item.name} done`}
          onClick={tap}
        />

        <button
          type="button"
          onClick={() => onEdit(item)}
          className="min-w-0 flex-1 rounded text-left"
        >
          <span className="block truncate text-base font-medium">{item.name}</span>
          <span className="block text-[13px] text-pretty text-muted nums">
            {cadence(item)}, {lastDone(item)}
          </span>
        </button>

        {!recentlyDone && (
          <span
            className={`shrink-0 text-sm nums ${
              tone === 'overdue' ? 'text-overdue' : tone === 'soon' ? 'text-soon' : 'text-muted'
            }`}
          >
            {dueLabel(item)}
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {askOdometer && (
          <motion.form
            onSubmit={submitOdometer}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 pb-4 pl-11">
              <label htmlFor={`odo-${item.id}`} className="text-sm text-muted">
                Odometer now
              </label>
              <input
                id={`odo-${item.id}`}
                inputMode="numeric"
                autoFocus
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder={minReading ? (minReading + item.every).toLocaleString('en-US') : '52,000'}
                className="w-32 nums"
              />
              <button
                type="submit"
                className="h-10 rounded-full bg-ink px-4 text-sm font-medium text-paper"
              >
                Mark done
              </button>
              <button
                type="button"
                onClick={() => setAskOdometer(false)}
                className="h-10 px-2 text-sm text-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.li>
  )
}
