import { Hono } from 'hono'
import { requireAccess } from './access'
import * as db from './db'
import type { CompletionInput, ItemInput, Unit } from '../shared/types'

const UNITS: Unit[] = ['day', 'week', 'month', 'year', 'mile']
const DATE = /^\d{4}-\d{2}-\d{2}$/

const isCount = (n: unknown) => Number.isInteger(n) && (n as number) > 0
const isOptionalCount = (n: unknown) => n == null || isCount(n)

function parseItem(body: any): ItemInput | null {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name || !isCount(body.every) || !UNITS.includes(body.unit)) return null
  if (!isOptionalCount(body.fallbackMonths)) return null
  if (body.leadDays != null && !(Number.isInteger(body.leadDays) && body.leadDays >= 0)) return null
  return {
    name,
    category: typeof body.category === 'string' && body.category.trim() ? body.category.trim().toLowerCase() : 'home',
    every: body.every,
    unit: body.unit,
    fallbackMonths: body.unit === 'mile' ? (body.fallbackMonths ?? null) : null,
    leadDays: body.leadDays ?? 7,
    notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
  }
}

function parseCompletion(body: any): CompletionInput | null {
  if (typeof body?.doneOn !== 'string' || !DATE.test(body.doneOn)) return null
  if (body.odometer != null && !(Number.isInteger(body.odometer) && body.odometer >= 0)) return null
  return {
    doneOn: body.doneOn,
    odometer: body.odometer ?? null,
    note: typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null,
  }
}

const app = new Hono<{ Bindings: Env }>().basePath('/api')

app.use('*', requireAccess)

app.get('/items', async (c) => c.json(await db.listItems(c.env.DB)))

// Creating an item takes when it was last done, so the first due date is real.
app.post('/items', async (c) => {
  const body = await c.req.json().catch(() => null)
  const item = parseItem(body)
  const last = parseCompletion(body?.lastDone)
  if (!item || !last) return c.json({ error: 'Invalid item' }, 400)
  if (item.unit === 'mile' && last.odometer == null) return c.json({ error: 'Mileage items need an odometer reading' }, 400)

  const id = await db.createItem(c.env.DB, item)
  await db.addCompletion(c.env.DB, id, last)
  return c.json(await db.getItem(c.env.DB, id), 201)
})

app.put('/items/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const item = parseItem(await c.req.json().catch(() => null))
  if (!item) return c.json({ error: 'Invalid item' }, 400)
  if (!(await db.getItem(c.env.DB, id))) return c.notFound()

  await db.updateItem(c.env.DB, id, item)
  return c.json(await db.getItem(c.env.DB, id))
})

app.delete('/items/:id', async (c) => {
  await db.deleteItem(c.env.DB, Number(c.req.param('id')))
  return c.body(null, 204)
})

app.post('/items/:id/done', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await db.getItem(c.env.DB, id)
  if (!existing) return c.notFound()

  const done = parseCompletion(await c.req.json().catch(() => null))
  if (!done) return c.json({ error: 'Invalid completion' }, 400)
  if (existing.unit === 'mile' && done.odometer == null) return c.json({ error: 'Odometer reading required' }, 400)

  const completionId = await db.addCompletion(c.env.DB, id, done)
  return c.json({ completionId, item: await db.getItem(c.env.DB, id) }, 201)
})

// Undo for a mistaken tap.
app.delete('/completions/:id', async (c) => {
  await db.deleteCompletion(c.env.DB, Number(c.req.param('id')))
  return c.body(null, 204)
})

export default app
