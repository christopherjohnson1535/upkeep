import { useRef, useState } from 'react'
import type { Group } from '../shared/types'
import { api, type Me } from './api'
import { FormError } from './components/Dialog'
import { shortDate } from './format'

interface Props {
  me: Me
  back: () => void
  refreshMe: () => Promise<void>
  onGroups: (groups: Group[]) => void
  onClaimed: (group: Group) => void
  onRecoveryCode: (code: string) => void
  onSignedOut: () => void
  say: (text: string) => void
}

const when = (sqlTime: string) => shortDate(sqlTime.slice(0, 10))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h2 className="font-medium">{title}</h2>
      {children}
    </section>
  )
}

export function AccountPage(props: Props) {
  const { me } = props
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const passkeys = me.passkeys ?? []

  async function attempt(action: () => Promise<void>) {
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-3">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            props.back()
          }}
          className="-ml-1 flex items-center gap-1 self-start rounded px-1 text-sm text-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Calendars
        </a>
        <h1 className="text-[32px] leading-[1.1] font-medium tracking-[-0.03em] sm:text-[40px]">Account</h1>
      </section>

      <FormError message={error} />

      <Section title="Passkeys">
        <p className="text-sm text-pretty text-muted">
          A passkey saved in iCloud Keychain or Google Password Manager is on all your devices already. Add another if
          you also sign in from somewhere that doesn't share it.
        </p>
        <ul className="border-t border-rule">
          {passkeys.map((p, i) => (
            <li key={p.id} className="flex items-center justify-between gap-4 border-b border-rule py-3">
              <span className="min-w-0">
                <span className="block">Passkey {i + 1}</span>
                <span className="block text-[13px] text-muted">
                  Added {when(p.createdAt)}
                  {p.lastUsedAt ? `, last used ${when(p.lastUsedAt)}` : ''}
                </span>
              </span>
              {passkeys.length > 1 && (
                <button
                  onClick={() =>
                    attempt(async () => {
                      if (!confirm('Remove this passkey? It will stop working for upkeep.')) return
                      await api.removePasskey(p.id)
                      await props.refreshMe()
                    })
                  }
                  className="button-quiet -mr-3 text-danger hover:text-danger"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          onClick={() =>
            attempt(async () => {
              await api.addPasskey()
              await props.refreshMe()
              props.say('Passkey added')
            })
          }
          className="button-secondary self-start"
        >
          Add a passkey
        </button>
      </Section>

      <Section title="Recovery code">
        <p className="text-sm text-pretty text-muted">
          {me.hasRecoveryCode
            ? 'You have a recovery code. Making a new one replaces it.'
            : "You don't have a recovery code right now. Make one so you can get back in if you lose your passkeys."}
        </p>
        <button
          onClick={() =>
            attempt(async () => {
              if (me.hasRecoveryCode && !confirm('Make a new recovery code? The old one stops working.')) return
              props.onRecoveryCode((await api.newRecoveryCode()).recoveryCode)
              await props.refreshMe()
            })
          }
          className={`${me.hasRecoveryCode ? 'button-secondary' : 'button-primary'} self-start`}
        >
          Make a new recovery code
        </button>
      </Section>

      <Section title="Your data">
        <p className="text-sm text-pretty text-muted">
          Download everything as a file you can keep, or bring a file back in. Imported groups get new calendar links,
          so subscribe to them again.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="/api/export" download className="button-secondary">
            Download my data
          </a>
          <button onClick={() => fileInput.current?.click()} className="button-secondary">
            Import a file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Import a file"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              attempt(async () => {
                let data: unknown
                try {
                  data = JSON.parse(await file.text())
                } catch {
                  throw new Error("That file isn't an upkeep export.")
                }
                props.onGroups(await api.importFile(data))
                props.say('Imported')
              })
            }}
          />
        </div>

        <form
          className="mt-3 flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            attempt(async () => {
              props.onClaimed(await api.claim(link))
              setLink('')
            })
          }}
        >
          <label htmlFor="claim" className="text-sm text-muted">
            Set up a calendar before accounts existed? Paste its link to move it here.
          </label>
          <div className="flex gap-2">
            <input
              id="claim"
              required
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://…/feed/….ics"
              className="min-w-0 flex-1"
            />
            <button type="submit" className="button-secondary shrink-0">
              Move here
            </button>
          </div>
        </form>
      </Section>

      <section className="border-t border-rule pt-4" aria-label="Sign out or delete">
        <div className="-ml-3 flex flex-wrap">
          <button
            onClick={() =>
              attempt(async () => {
                await api.signOut()
                props.onSignedOut()
              })
            }
            className="button-quiet"
          >
            Sign out
          </button>
          <button
            onClick={() =>
              attempt(async () => {
                if (!confirm('Delete your account, every group and every task? Subscribed calendars stop working. This cannot be undone.')) return
                await api.deleteAccount()
                props.onSignedOut()
              })
            }
            className="button-quiet text-danger hover:text-danger"
          >
            Delete account
          </button>
        </div>
      </section>
    </div>
  )
}
