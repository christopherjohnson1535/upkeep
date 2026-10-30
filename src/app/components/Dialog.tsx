import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  children: React.ReactNode
}

export function Dialog({ open, title, onClose, onSubmit, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-paper p-0 text-ink shadow-[0_24px_64px_-24px_rgb(22_25_29/0.4)] open:animate-[dialog-in_200ms_var(--ease-out-quint)]"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5 p-6">
        <h2 className="text-xl font-medium tracking-tight">{title}</h2>
        {children}
      </form>
    </dialog>
  )
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

export function FormError({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  )
}
