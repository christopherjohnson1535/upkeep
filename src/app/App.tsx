import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import type { Group, GroupInput, Task, TaskInput } from '../shared/types'
import { AccountPage } from './AccountPage'
import { api, SignedOut, type Me } from './api'
import { GroupDialog } from './components/GroupDialog'
import { RecoveryCodeDialog } from './components/RecoveryCodeDialog'
import { TaskDialog } from './components/TaskDialog'
import { Toast, type ToastMessage } from './components/Toast'
import { GroupList } from './GroupList'
import { GroupPage } from './GroupPage'
import { Landing } from './Landing'

type Route = { page: 'list' } | { page: 'group'; id: number } | { page: 'account' }

function routeFromPath(): Route {
  const group = location.pathname.match(/^\/g\/(\d+)/)
  if (group) return { page: 'group', id: Number(group[1]) }
  if (location.pathname.startsWith('/account')) return { page: 'account' }
  return { page: 'list' }
}

const pathOf = (route: Route) => (route.page === 'group' ? `/g/${route.id}` : route.page === 'account' ? '/account' : '/')

export function App() {
  const [me, setMe] = useState<Me | null>(null)
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [route, setRoute] = useState<Route>(routeFromPath)
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null })
  const [groupDialog, setGroupDialog] = useState<{ open: boolean; group: Group | null; copyFrom: number | null }>({
    open: false,
    group: null,
    copyFrom: null,
  })
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])

  const refreshMe = useCallback(async () => setMe(await api.me()), [])

  const load = useCallback(async () => {
    setLoadError('')
    try {
      const current = await api.me()
      setMe(current)
      setGroups(current.signedIn ? await api.groups() : null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath())
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  function go(next: Route) {
    history.pushState(null, '', pathOf(next))
    setRoute(next)
    scrollTo(0, 0)
  }

  const say = (text: string) => setToast({ id: Date.now(), text })

  function signedOut() {
    setMe({ signedIn: false })
    setGroups(null)
    go({ page: 'list' })
  }

  // Any request can find the session gone; send them back to the front page.
  async function guard<T>(action: () => Promise<T>) {
    try {
      return await action()
    } catch (err) {
      if (err instanceof SignedOut) signedOut()
      throw err
    }
  }

  function putGroup(group: Group) {
    setGroups((list) => {
      const rest = (list ?? []).filter((g) => g.id !== group.id)
      return [...rest, group].sort((a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name))
    })
  }

  function putTask(task: Task) {
    setGroups((list) =>
      (list ?? []).map((g) =>
        g.id === task.groupId ? { ...g, tasks: [...g.tasks.filter((t) => t.id !== task.id), task] } : g,
      ),
    )
  }

  const group = route.page === 'group' ? (groups?.find((g) => g.id === route.id) ?? null) : null

  async function saveGroup(input: GroupInput & { copyFrom: number | null }) {
    if (groupDialog.group) {
      const id = groupDialog.group.id
      putGroup(await guard(() => api.updateGroup(id, input)))
    } else {
      const created = await guard(() => api.createGroup(input))
      putGroup(created)
      go({ page: 'group', id: created.id })
    }
  }

  async function saveTask(input: TaskInput) {
    if (!group) return
    const editing = taskDialog.task
    putTask(await guard(() => (editing ? api.updateTask(editing.id, input) : api.createTask(group.id, input))))
  }

  async function deleteTask(task: Task) {
    await guard(() => api.deleteTask(task.id))
    setGroups((list) => (list ?? []).map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== task.id) })))
    say(`Deleted ${task.name}`)
  }

  async function groupAction(action: () => Promise<Group>, message: string) {
    putGroup(await guard(action))
    say(message)
  }

  const signedIn = me?.signedIn === true
  const pageKey = !signedIn ? 'landing' : route.page === 'group' ? `g${route.id}` : route.page

  return (
    <div className="mx-auto flex min-h-dvh max-w-160 flex-col px-5 pt-8 pb-32 sm:px-6 sm:pt-12">
      <header className="flex items-baseline justify-between">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            go({ page: 'list' })
          }}
          className="rounded text-[15px] font-semibold tracking-tight"
        >
          upkeep
        </a>
        {signedIn && (
          <a
            href="/account"
            aria-current={route.page === 'account' ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault()
              go({ page: 'account' })
            }}
            className="rounded px-1 text-sm text-muted hover:text-ink aria-[current=page]:text-ink"
          >
            Account
          </a>
        )}
      </header>

      <main className="mt-12 sm:mt-16">
        {loadError ? (
          <section className="flex flex-col items-start gap-4">
            <h1 className="text-3xl font-medium tracking-tight">Couldn't load upkeep.</h1>
            <p className="text-muted">{loadError}</p>
            <button onClick={load} className="button-secondary">
              Try again
            </button>
          </section>
        ) : me === null ? null : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pageKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {!signedIn ? (
                <Landing
                  onSignedIn={async (code) => {
                    await load()
                    if (code) setRecoveryCode(code)
                  }}
                />
              ) : route.page === 'account' ? (
                <AccountPage
                  me={me}
                  back={() => go({ page: 'list' })}
                  refreshMe={refreshMe}
                  onGroups={setGroups}
                  onClaimed={(g) => {
                    putGroup(g)
                    go({ page: 'group', id: g.id })
                    say(`${g.name} is in your account now`)
                  }}
                  onRecoveryCode={setRecoveryCode}
                  onSignedOut={signedOut}
                  say={say}
                />
              ) : group ? (
                <GroupPage
                  group={group}
                  back={() => go({ page: 'list' })}
                  onAddTask={() => setTaskDialog({ open: true, task: null })}
                  onEditTask={(task) => setTaskDialog({ open: true, task })}
                  onRename={() => setGroupDialog({ open: true, group, copyFrom: null })}
                  onCopy={() => setGroupDialog({ open: true, group: null, copyFrom: group.id })}
                  onNewLink={() => {
                    if (confirm('Calendars subscribed with the current link stop updating. Make a new link?'))
                      groupAction(() => api.newLink(group.id), 'New link ready. Subscribe with it again.')
                  }}
                  onArchive={() => groupAction(() => api.archive(group.id), `Archived ${group.name}. Its calendar is now empty.`)}
                  onRestore={() => groupAction(() => api.restore(group.id), `Restored ${group.name}`)}
                  onDelete={async () => {
                    if (!confirm(`Delete ${group.name} and its tasks for good?`)) return
                    await guard(() => api.deleteGroup(group.id))
                    setGroups((list) => (list ?? []).filter((g) => g.id !== group.id))
                    go({ page: 'list' })
                    say(`Deleted ${group.name}`)
                  }}
                  onCopied={() => say('Link copied')}
                />
              ) : (
                <GroupList
                  groups={groups ?? []}
                  open={(g) => go({ page: 'group', id: g.id })}
                  onNew={() => setGroupDialog({ open: true, group: null, copyFrom: null })}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <TaskDialog
        open={taskDialog.open}
        task={taskDialog.task}
        kind={group?.kind ?? 'home'}
        taken={group?.tasks.map((t) => t.name) ?? []}
        onClose={() => setTaskDialog((d) => ({ ...d, open: false }))}
        onSave={saveTask}
        onDelete={deleteTask}
      />
      <GroupDialog
        open={groupDialog.open}
        group={groupDialog.group}
        groups={groups ?? []}
        copyFrom={groupDialog.copyFrom}
        onClose={() => setGroupDialog((d) => ({ ...d, open: false }))}
        onSave={saveGroup}
      />
      <RecoveryCodeDialog code={recoveryCode} onClose={() => setRecoveryCode(null)} />
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}
