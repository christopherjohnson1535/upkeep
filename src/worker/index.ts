import { Hono } from 'hono'
import { nextOn, startProblem } from '../shared/schedule'
import type { GroupInput, Kind, TaskInput, Unit } from '../shared/types'
import { requireAccess } from './access'
import * as db from './db'
import { calendar } from './ics'

const UNITS: Unit[] = ['day', 'week', 'month', 'year']
const KINDS: Kind[] = ['home', 'car', 'other']
const DATE = /^\d{4}-\d{2}-\d{2}$/

const trimmed = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const whole = (v: unknown, min: number) => Number.isInteger(v) && (v as number) >= min

function parseGroup(body: any): GroupInput | null {
  const name = trimmed(body?.name)
  if (!name || !KINDS.includes(body.kind)) return null
  return { name, kind: body.kind }
}

function parseTask(body: any): TaskInput | string {
  const name = trimmed(body?.name)
  if (!name) return 'Give the task a name.'
  if (!whole(body.every, 1) || !UNITS.includes(body.unit)) return 'Set how often it repeats.'
  if (typeof body.startsOn !== 'string' || !DATE.test(body.startsOn)) return 'Pick the next date.'
  const problem = startProblem(body.startsOn, body.unit)
  if (problem) return problem
  if (!whole(body.remindDays, 0)) return 'Reminder days must be 0 or more.'
  if (body.miles != null && !whole(body.miles, 1)) return 'Miles must be a whole number.'
  return {
    name,
    every: body.every,
    unit: body.unit,
    startsOn: body.startsOn,
    remindDays: body.remindDays,
    miles: body.miles ?? null,
    notes: trimmed(body.notes),
  }
}

const id = (raw: string) => Number(raw)
const today = () => new Date().toISOString().slice(0, 10)

const api = new Hono<{ Bindings: Env }>()

api.use('*', requireAccess)

api.get('/groups', async (c) => c.json(await db.listGroups(c.env.DB)))

// Copying a group starts each task at its next date, ready to be adjusted for
// the new house or car.
api.post('/groups', async (c) => {
  const body = await c.req.json().catch(() => null)
  const group = parseGroup(body)
  if (!group) return c.json({ error: 'Give the group a name.' }, 400)

  const groupId = await db.createGroup(c.env.DB, group)
  if (body.copyFrom != null) {
    const source = await db.getGroup(c.env.DB, id(body.copyFrom))
    const now = today()
    await db.createTasks(
      c.env.DB,
      groupId,
      (source?.tasks ?? []).map(({ name, every, unit, remindDays, miles, notes, ...t }) => ({
        name,
        every,
        unit,
        remindDays,
        miles,
        notes,
        startsOn: nextOn({ ...t, every, unit }, now),
      })),
    )
  }
  return c.json(await db.getGroup(c.env.DB, groupId), 201)
})

api.put('/groups/:id', async (c) => {
  const group = parseGroup(await c.req.json().catch(() => null))
  if (!group) return c.json({ error: 'Give the group a name.' }, 400)
  await db.updateGroup(c.env.DB, id(c.req.param('id')), group)
  return c.json(await db.getGroup(c.env.DB, id(c.req.param('id'))))
})

api.post('/groups/:id/archive', async (c) => {
  await db.setArchived(c.env.DB, id(c.req.param('id')), true)
  return c.json(await db.getGroup(c.env.DB, id(c.req.param('id'))))
})

api.post('/groups/:id/restore', async (c) => {
  await db.setArchived(c.env.DB, id(c.req.param('id')), false)
  return c.json(await db.getGroup(c.env.DB, id(c.req.param('id'))))
})

api.post('/groups/:id/new-link', async (c) => {
  await db.resetToken(c.env.DB, id(c.req.param('id')))
  return c.json(await db.getGroup(c.env.DB, id(c.req.param('id'))))
})

api.delete('/groups/:id', async (c) => {
  await db.deleteGroup(c.env.DB, id(c.req.param('id')))
  return c.body(null, 204)
})

api.post('/groups/:id/tasks', async (c) => {
  const groupId = id(c.req.param('id'))
  if (!(await db.getGroup(c.env.DB, groupId))) return c.notFound()
  const task = parseTask(await c.req.json().catch(() => null))
  if (typeof task === 'string') return c.json({ error: task }, 400)
  return c.json(await db.getTask(c.env.DB, await db.createTask(c.env.DB, groupId, task)), 201)
})

api.put('/tasks/:id', async (c) => {
  const taskId = id(c.req.param('id'))
  if (!(await db.getTask(c.env.DB, taskId))) return c.notFound()
  const task = parseTask(await c.req.json().catch(() => null))
  if (typeof task === 'string') return c.json({ error: task }, 400)
  await db.updateTask(c.env.DB, taskId, task)
  return c.json(await db.getTask(c.env.DB, taskId))
})

api.delete('/tasks/:id', async (c) => {
  await db.deleteTask(c.env.DB, id(c.req.param('id')))
  return c.body(null, 204)
})

const app = new Hono<{ Bindings: Env }>()

app.route('/api', api)

// Calendar apps can't sign in, so the feed sits outside Access and the
// unguessable token in the URL is what protects it.
app.get('/feed/:file', async (c) => {
  const file = c.req.param('file')
  if (!file.endsWith('.ics')) return c.notFound()
  const group = await db.groupByToken(c.env.DB, file.slice(0, -4))
  if (!group) return c.notFound()

  return c.body(calendar(group.name, group.archived ? [] : group.tasks), 200, {
    'content-type': 'text/calendar; charset=utf-8',
    'cache-control': 'private, max-age=300',
  })
})

export default app
