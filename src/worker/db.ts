import { nextDue } from '../shared/due'
import type { Completion, CompletionInput, Item, ItemInput, ItemWithDue } from '../shared/types'

interface ItemRow {
  id: number
  name: string
  category: string
  every: number
  unit: Item['unit']
  fallback_months: number | null
  lead_days: number
  notes: string | null
  last_id: number | null
  last_done_on: string | null
  last_odometer: number | null
  last_note: string | null
}

// Each item joined to its most recent completion.
const SELECT_ITEMS = `
  SELECT i.*, c.id AS last_id, c.done_on AS last_done_on,
         c.odometer AS last_odometer, c.note AS last_note
  FROM items i
  LEFT JOIN completions c ON c.id = (
    SELECT id FROM completions WHERE item_id = i.id
    ORDER BY done_on DESC, id DESC LIMIT 1
  )`

function toItem(row: ItemRow): ItemWithDue {
  const item: Item = {
    id: row.id,
    name: row.name,
    category: row.category,
    every: row.every,
    unit: row.unit,
    fallbackMonths: row.fallback_months,
    leadDays: row.lead_days,
    notes: row.notes,
  }
  const last: Completion | null =
    row.last_id == null
      ? null
      : { id: row.last_id, doneOn: row.last_done_on!, odometer: row.last_odometer, note: row.last_note }
  return { ...item, last, ...nextDue(item, last) }
}

export async function listItems(db: D1Database) {
  const { results } = await db.prepare(`${SELECT_ITEMS} ORDER BY i.name`).all<ItemRow>()
  return results.map(toItem)
}

export async function getItem(db: D1Database, id: number) {
  const row = await db.prepare(`${SELECT_ITEMS} WHERE i.id = ?`).bind(id).first<ItemRow>()
  return row ? toItem(row) : null
}

export async function createItem(db: D1Database, input: ItemInput) {
  const row = await db
    .prepare(
      `INSERT INTO items (name, category, every, unit, fallback_months, lead_days, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(
      input.name,
      input.category,
      input.every,
      input.unit,
      input.fallbackMonths ?? null,
      input.leadDays ?? 7,
      input.notes ?? null,
    )
    .first<{ id: number }>()
  return row!.id
}

export async function updateItem(db: D1Database, id: number, input: ItemInput) {
  await db
    .prepare(
      `UPDATE items SET name = ?, category = ?, every = ?, unit = ?,
         fallback_months = ?, lead_days = ?, notes = ?
       WHERE id = ?`,
    )
    .bind(
      input.name,
      input.category,
      input.every,
      input.unit,
      input.fallbackMonths ?? null,
      input.leadDays ?? 7,
      input.notes ?? null,
      id,
    )
    .run()
}

export async function deleteItem(db: D1Database, id: number) {
  await db.prepare('DELETE FROM items WHERE id = ?').bind(id).run()
}

export async function addCompletion(db: D1Database, itemId: number, input: CompletionInput) {
  const row = await db
    .prepare('INSERT INTO completions (item_id, done_on, odometer, note) VALUES (?, ?, ?, ?) RETURNING id')
    .bind(itemId, input.doneOn, input.odometer ?? null, input.note ?? null)
    .first<{ id: number }>()
  return row!.id
}

export async function deleteCompletion(db: D1Database, id: number) {
  await db.prepare('DELETE FROM completions WHERE id = ?').bind(id).run()
}
