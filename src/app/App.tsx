import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import type { Group, GroupInput, Task, TaskInput } from '../shared/types'
import { api } from './api'
import { GroupDialog } from './components/GroupDialog'
import { TaskDialog } from './components/TaskDialog'
import { Toast, type ToastMessage } from './components/Toast'
import { GroupList } from './GroupList'
import { GroupPage } from './GroupPage'

const groupFromPath = () => {
  const match = location.pathname.match(/^\/g\/(\d+)/)
  return match ? Number(match[1]) : null
}

export function App() {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [groupId, setGroupId] = useState<number | null>(groupFromPath)
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null })
  const [groupDialog, setGroupDialog] = useState<{ open: boolean; group: Group | null; copyFrom: number | null }>({
    open: false,
    group: null,
    copyFrom: null,
  })
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])

  const load = useCallback(() => {
    setLoadError('')
    api.groups().then(setGroups, (err: Error) => setLoadError(err.message))
  }, [])

  useEffect(load, [load])

  useEffect(() => {
    const onPop = () => setGroupId(groupFromPath())
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  function go(id: number | null) {
    history.pushState(null, '', id == null ? '/' : `/g/${id}`)
    setGroupId(id)
    scrollTo(0, 0)
  }

  const say = (text: string) => setToast({ id: Date.now(), text })

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

  const group = groups?.find((g) => g.id === groupId) ?? null

  async function saveGroup(input: GroupInput & { copyFrom: number | null }) {
    if (groupDialog.group) {
      putGroup(await api.updateGroup(groupDialog.group.id, input))
    } else {
      const created = await api.createGroup(input)
      putGroup(created)
      go(created.id)
    }
  }

  async function saveTask(input: TaskInput) {
    if (!group) return
    putTask(taskDialog.task ? await api.updateTask(taskDialog.task.id, input) : await api.createTask(group.id, input))
  }

  async function deleteTask(task: Task) {
    await api.deleteTask(task.id)
    setGroups((list) => (list ?? []).map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== task.id) })))
    say(`Deleted ${task.name}`)
  }

  async function groupAction(action: () => Promise<Group>, message: string) {
    putGroup(await action())
    say(message)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-160 flex-col px-5 pt-8 pb-32 sm:px-6 sm:pt-12">
      <header className="flex items-baseline justify-between">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            go(null)
          }}
          className="rounded text-[15px] font-semibold tracking-tight"
        >
          upkeep
        </a>
      </header>

      <main className="mt-12 sm:mt-16">
        {loadError ? (
          <section className="flex flex-col items-start gap-4">
            <h1 className="text-3xl font-medium tracking-tight">Couldn't load your calendars.</h1>
            <p className="text-muted">{loadError}</p>
            <button onClick={load} className="button-secondary">
              Try again
            </button>
          </section>
        ) : groups === null ? null : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={group ? `g${group.id}` : 'list'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {group ? (
                <GroupPage
                  group={group}
                  back={() => go(null)}
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
                    await api.deleteGroup(group.id)
                    setGroups((list) => (list ?? []).filter((g) => g.id !== group.id))
                    go(null)
                    say(`Deleted ${group.name}`)
                  }}
                  onCopied={() => say('Link copied')}
                />
              ) : (
                <GroupList
                  groups={groups}
                  open={(g) => go(g.id)}
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
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}
