import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'

export interface ToastMessage {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onDismiss, 6000)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-10 flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex items-center gap-4 rounded-full bg-ink py-2 pr-2 pl-5 text-sm text-paper"
          >
            <span>{toast.text}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.run()
                  onDismiss()
                }}
                className="h-9 rounded-full px-4 font-medium text-paper hover:bg-white/10"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
