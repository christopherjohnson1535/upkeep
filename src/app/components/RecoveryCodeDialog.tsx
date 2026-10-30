import { useState } from 'react'
import { Dialog } from './Dialog'

export function RecoveryCodeDialog({ code, onClose }: { code: string | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  return (
    <Dialog
      open={code != null}
      title="Save your recovery code"
      onClose={() => {
        setCopied(false)
        onClose()
      }}
      onSubmit={(e) => {
        e.preventDefault()
        setCopied(false)
        onClose()
      }}
    >
      <p className="-mt-2 text-pretty text-muted">
        If you ever lose every passkey, this code gets you back in. It works once. Keep it somewhere safe, like your
        password manager.
      </p>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-rule bg-card px-4 py-3">
        <code className="text-lg font-medium tracking-wider nums">{code}</code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(code ?? '')
            setCopied(true)
          }}
          className="button-quiet -mr-3 shrink-0"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="pt-1">
        <button type="submit" className="button-primary">
          I saved it
        </button>
      </div>
    </Dialog>
  )
}
