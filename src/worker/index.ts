import { Hono, type Context } from 'hono'
import { nextOn } from '../shared/schedule'
import type { TaskInput } from '../shared/types'
import { auth, deleteAccount, requireUser, type AppEnv } from './auth'
import { backup } from './backup'
import * as db from './db'
import { calendar } from './ics'
import { parseGroup, parseTask } from './validate'

// Keeps one account from using up the free tier for everyone else.
export const MAX_GROUPS = 10
export const MAX_TASKS = 100

const id = (raw: string) => Number(raw)
const today = () => new Date().toISOString().slice(0, 10)
const tooManyGroups = `An account can have up to ${MAX_GROUPS} groups. Delete an archived one to make room.`
const tooManyTasks = `A group can have up to ${MAX_TASKS} tasks.`

const api = new Hono<AppEnv>()

api.get('/config', (c) => c.json({ turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || null }))
api.route('/auth', auth)

api.use('/groups/*', requireUser)
api.use('/groups', requireUser)
api.use('/tasks/*', requireUser)
api.use('/account', requireUser)
api.use('/export', requireUser)
api.use('/import', requireUser)

api.get('/groups', async (c) => c.json(await db.listGroups(c.env.DB, c.get('userId'))))

// Copying a group starts each task at its next date, ready to be adjusted for
// the new house or car.
api.post('/groups', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => null)
  const group = parseGroup(body)
  if (!group) return c.json({ error: 'Give the group a name.' }, 400)
  if ((await db.countGroups(c.env.DB, userId)) >= MAX_GROUPS) return c.json({ error: tooManyGroups }, 400)

  const source = body.copyFrom != null ? await db.getGroup(c.env.DB, id(body.copyFrom), userId) : null
  const groupId = await db.createGroup(c.env.DB, userId, group)
  if (source) {
    const now = today()
    await db.createTasks(
      c.env.DB,
      groupId,
      source.tasks.map((t) => ({
        name: t.name,
        every: t.every,
        unit: t.unit,
        remindDays: t.remindDays,
        miles: t.miles,
        notes: t.notes,
        startsOn: nextOn(t, now),
      })),
    )
  }
  return c.json(await db.getGroup(c.env.DB, groupId, userId), 201)
})

api.post('/groups/claim', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => null)
  const token = String(body?.link ?? '').match(/[0-9a-f]{32}/)?.[0]
  if (!token) return c.json({ error: "That doesn't look like an upkeep calendar link." }, 400)
  if ((await db.countGroups(c.env.DB, userId)) >= MAX_GROUPS) return c.json({ error: tooManyGroups }, 400)

  const groupId = await db.claimGroup(c.env.DB, token, userId)
  if (!groupId) return c.json({ error: 'No unclaimed calendar matches that link.' }, 404)
  return c.json(await db.getGroup(c.env.DB, groupId, userId))
})

// Every route below acts on one group, so ownership is checked once here.
api.use('/groups/:id/*', async (c, next) => {
  if (!(await db.getGroup(c.env.DB, id(c.req.param('id')), c.get('userId')))) return c.notFound()
  return next()
})

const owned = (c: Context<AppEnv>) => db.getGroup(c.env.DB, id(c.req.param('id')!), c.get('userId'))

api.put('/groups/:id', async (c) => {
  if (!(await owned(c))) return c.notFound()
  const group = parseGroup(await c.req.json().catch(() => null))
  if (!group) return c.json({ error: 'Give the group a name.' }, 400)
  await db.updateGroup(c.env.DB, id(c.req.param('id')), group)
  return c.json(await owned(c))
})

api.delete('/groups/:id', async (c) => {
  if (!(await owned(c))) return c.notFound()
  await db.deleteGroup(c.env.DB, id(c.req.param('id')))
  return c.body(null, 204)
})

api.post('/groups/:id/archive', async (c) => {
  await db.setArchived(c.env.DB, id(c.req.param('id')), true)
  return c.json(await owned(c))
})

api.post('/groups/:id/restore', async (c) => {
  await db.setArchived(c.env.DB, id(c.req.param('id')), false)
  return c.json(await owned(c))
})

api.post('/groups/:id/new-link', async (c) => {
  await db.resetToken(c.env.DB, id(c.req.param('id')))
  return c.json(await owned(c))
})

api.post('/groups/:id/tasks', async (c) => {
  const groupId = id(c.req.param('id'))
  if ((await db.countTasks(c.env.DB, groupId)) >= MAX_TASKS) return c.json({ error: tooManyTasks }, 400)
  const task = parseTask(await c.req.json().catch(() => null))
  if (typeof task === 'string') return c.json({ error: task }, 400)
  return c.json(await db.getTask(c.env.DB, await db.createTask(c.env.DB, groupId, task), c.get('userId')), 201)
})

api.put('/tasks/:id', async (c) => {
  const taskId = id(c.req.param('id'))
  if (!(await db.getTask(c.env.DB, taskId, c.get('userId')))) return c.notFound()
  const task = parseTask(await c.req.json().catch(() => null))
  if (typeof task === 'string') return c.json({ error: task }, 400)
  await db.updateTask(c.env.DB, taskId, task)
  return c.json(await db.getTask(c.env.DB, taskId, c.get('userId')))
})

api.delete('/tasks/:id', async (c) => {
  const taskId = id(c.req.param('id'))
  if (!(await db.getTask(c.env.DB, taskId, c.get('userId')))) return c.notFound()
  await db.deleteTask(c.env.DB, taskId)
  return c.body(null, 204)
})

api.get('/export', async (c) => {
  const groups = await db.listGroups(c.env.DB, c.get('userId'))
  const file = {
    app: 'upkeep',
    version: 1,
    exportedAt: new Date().toISOString(),
    groups: groups.map((g) => ({
      name: g.name,
      kind: g.kind,
      archived: g.archived,
      tasks: g.tasks.map(({ name, every, unit, startsOn, remindDays, miles, notes }) => ({
        name,
        every,
        unit,
        startsOn,
        remindDays,
        miles,
        notes,
      })),
    })),
  }
  return c.json(file, 200, {
    'content-disposition': `attachment; filename="upkeep-${file.exportedAt.slice(0, 10)}.json"`,
  })
})

// Imported groups get new calendar links, so they need subscribing again.
api.post('/import', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => null)
  if (body?.app !== 'upkeep' || !Array.isArray(body.groups)) return c.json({ error: "That isn't an upkeep export file." }, 400)

  const groups: { group: NonNullable<ReturnType<typeof parseGroup>>; archived: boolean; tasks: TaskInput[] }[] = []
  for (const raw of body.groups) {
    const group = parseGroup(raw)
    const tasks = (Array.isArray(raw?.tasks) ? raw.tasks : []).map(parseTask)
    const bad = tasks.find((t: TaskInput | string) => typeof t === 'string')
    if (!group || bad) return c.json({ error: `Couldn't read "${raw?.name ?? 'a group'}" in that file.` }, 400)
    if (tasks.length > MAX_TASKS) return c.json({ error: tooManyTasks }, 400)
    groups.push({ group, archived: raw.archived === true, tasks })
  }
  if ((await db.countGroups(c.env.DB, userId)) + groups.length > MAX_GROUPS) return c.json({ error: tooManyGroups }, 400)

  for (const { group, archived, tasks } of groups) {
    const groupId = await db.createGroup(c.env.DB, userId, group)
    await db.createTasks(c.env.DB, groupId, tasks)
    if (archived) await db.setArchived(c.env.DB, groupId, true)
  }
  return c.json(await db.listGroups(c.env.DB, userId), 201)
})

api.delete('/account', async (c) => {
  await deleteAccount(c)
  return c.body(null, 204)
})

const app = new Hono<AppEnv>()

app.route('/api', api)

// Calendar apps can't sign in, so the unguessable token in the URL is what
// protects a feed. "New calendar link" replaces it.
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

export default {
  fetch: app.fetch,
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(backup(env))
  },
} satisfies ExportedHandler<Env>
