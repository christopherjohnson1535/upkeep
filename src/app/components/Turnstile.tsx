import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void }) => string
      remove: (id: string) => void
    }
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadScript() {
  if (window.turnstile) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`)
    const script = existing ?? Object.assign(document.createElement('script'), { src: SCRIPT, async: true })
    script.addEventListener('load', () => resolve())
    if (!existing) document.head.appendChild(script)
  })
}

// Cloudflare's free bot check. Only rendered when a site key is configured.
export function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let id: string | undefined
    let cancelled = false
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return
      id = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token) => onToken(token),
        'expired-callback': () => onToken(null),
      })
    })
    return () => {
      cancelled = true
      if (id) window.turnstile?.remove(id)
    }
  }, [siteKey, onToken])

  return <div ref={ref} />
}
