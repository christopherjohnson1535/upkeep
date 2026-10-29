import { motion } from 'motion/react'

type Tone = 'overdue' | 'soon' | 'normal'

const STROKE: Record<Tone, string> = {
  overdue: 'var(--color-overdue)',
  soon: 'var(--color-soon)',
  normal: 'var(--color-ink)',
}

const R = 12
const C = 2 * Math.PI * R
const CHECK = 'M10.5 16.5l3.5 3.5 7.5-8'

interface Props {
  progress: number
  tone: Tone
  done: boolean
  label: string
  onClick: () => void
}

// The tick button doubles as a gauge: the arc is how much of the interval has
// passed, so a glance down the list shows what's close without reading dates.
export function DueRing({ progress, tone, done, label, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={done}
      aria-label={label}
      className="group -m-2 grid size-11 shrink-0 place-items-center rounded-full disabled:cursor-default"
    >
      <svg viewBox="0 0 32 32" className="size-7 -rotate-90" aria-hidden="true">
        <circle cx="16" cy="16" r={R} fill="none" stroke="var(--color-rule)" strokeWidth="2.5" />
        <motion.circle
          cx="16"
          cy="16"
          r={R}
          fill="none"
          stroke={done ? STROKE.normal : STROKE[tone]}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={false}
          animate={{ strokeDashoffset: C * (1 - (done ? 1 : progress)) }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.circle
          cx="16"
          cy="16"
          r={R - 1.25}
          fill="var(--color-ink)"
          initial={false}
          animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: 0.25, delay: done ? 0.2 : 0, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: '16px 16px' }}
        />
        <g className="rotate-90" style={{ transformOrigin: '16px 16px' }}>
          {!done && (
            <path
              d={CHECK}
              fill="none"
              stroke="var(--color-faint)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            />
          )}
          <motion.path
            d={CHECK}
            fill="none"
            stroke="var(--color-paper)"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
            transition={{ duration: 0.25, delay: done ? 0.35 : 0 }}
          />
        </g>
      </svg>
    </button>
  )
}
