import type { Group, GroupInput, Kind, Task, TaskInput, Unit } from '../shared/types'
import { randomHex } from './crypto'

interface GroupRow {
  id: number
  name: string
  kind: Kind
  token: string
  archived_at: string | null
}

interface TaskRow {
  id: number
  group_id: number
  name: string
  every: number
  unit: Unit
  starts_on: string
  remind_days: number
  miles: number | null
  notes: string | null
  updated_at: string
}

const toTask = (r: TaskRow): Task => ({
  id: r.id,
  groupId: r.group_id,
  name: r.name,
  every: r.every,
  unit: r.unit,
  startsOn: r.starts_on,
  remindDays: r.remind_days,
  miles: r.miles,
  notes: r.notes,
  updatedAt: r.updated_at,
})

const toGroup = (r: GroupRow, tasks: Task[]): Group => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  token: r.token,
  archived: r.archived_at != null,
  tasks: tasks.filter((t) => t.groupId === r.id),
})

export async function listGroups(db: D1Database, userId: number) {
  const [groups, tasks] = await db.batch([
    db.prepare('SELECT * FROM groups WHERE user_id = ? ORDER BY archived_at IS NOT NULL, name').bind(userId),
    db
      .prepare('SELECT t.* FROM tasks t JOIN groups g ON g.id = t.group_id WHERE g.user_id = ? ORDER BY t.name')
      .bind(userId),
  ])
  const all = (tasks.results as TaskRow[]).map(toTask)
  return (groups.results as GroupRow[]).map((g) => toGroup(g, all))
}

async function loadGroup(db: D1Database, row: GroupRow | null) {
  if (!row) return null
  const { results } = await db.prepare('SELECT * FROM tasks WHERE group_id = ? ORDER BY name').bind(row.id).all<TaskRow>()
  return toGroup(row, results.map(toTask))
}

export async function getGroup(db: D1Database, id: number, userId: number) {
  return loadGroup(db, await db.prepare('SELECT * FROM groups WHERE id = ? AND user_id = ?').bind(id, userId).first<GroupRow>())
}

export async function groupByToken(db: D1Database, token: string) {
  return loadGroup(db, await db.prepare('SELECT * FROM groups WHERE token = ?').bind(token).first<GroupRow>())
}

export async function countGroups(db: D1Database, userId: number) {
  const row = await db.prepare('SELECT count(*) AS n FROM groups WHERE user_id = ?').bind(userId).first<{ n: number }>()
  return row?.n ?? 0
}

export async function countTasks(db: D1Database, groupId: number) {
  const row = await db.prepare('SELECT count(*) AS n FROM tasks WHERE group_id = ?').bind(groupId).first<{ n: number }>()
  return row?.n ?? 0
}

export async function createGroup(db: D1Database, userId: number, input: GroupInput) {
  const row = await db
    .prepare('INSERT INTO groups (user_id, name, kind, token) VALUES (?, ?, ?, ?) RETURNING id')
    .bind(userId, input.name, input.kind, randomHex(16))
    .first<{ id: number }>()
  return row!.id
}

// Owner checks happen in the route before these run, so they work by id alone.

export async function updateGroup(db: D1Database, id: number, input: GroupInput) {
  await db.prepare('UPDATE groups SET name = ?, kind = ? WHERE id = ?').bind(input.name, input.kind, id).run()
}

export async function setArchived(db: D1Database, id: number, archived: boolean) {
  await db
    .prepare(`UPDATE groups SET archived_at = ${archived ? "datetime('now')" : 'NULL'} WHERE id = ?`)
    .bind(id)
    .run()
}

export async function resetToken(db: D1Database, id: number) {
  await db.prepare('UPDATE groups SET token = ? WHERE id = ?').bind(randomHex(16), id).run()
}

export async function deleteGroup(db: D1Database, id: number) {
  await db.prepare('DELETE FROM groups WHERE id = ?').bind(id).run()
}

// Groups from before accounts existed belong to whoever has their calendar link.
export async function claimGroup(db: D1Database, token: string, userId: number) {
  const row = await db
    .prepare('UPDATE groups SET user_id = ? WHERE token = ? AND user_id IS NULL RETURNING id')
    .bind(userId, token)
    .first<{ id: number }>()
  return row?.id ?? null
}

const TASK_COLUMNS = 'name, every, unit, starts_on, remind_days, miles, notes'
const taskValues = (t: TaskInput) => [t.name, t.every, t.unit, t.startsOn, t.remindDays, t.miles, t.notes]

export async function createTask(db: D1Database, groupId: number, input: TaskInput) {
  const row = await db
    .prepare(`INSERT INTO tasks (group_id, ${TASK_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`)
    .bind(groupId, ...taskValues(input))
    .first<{ id: number }>()
  return row!.id
}

export async function createTasks(db: D1Database, groupId: number, inputs: TaskInput[]) {
  if (!inputs.length) return
  const insert = db.prepare(`INSERT INTO tasks (group_id, ${TASK_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
  await db.batch(inputs.map((t) => insert.bind(groupId, ...taskValues(t))))
}

export async function getTask(db: D1Database, id: number, userId: number) {
  const row = await db
    .prepare('SELECT t.* FROM tasks t JOIN groups g ON g.id = t.group_id WHERE t.id = ? AND g.user_id = ?')
    .bind(id, userId)
    .first<TaskRow>()
  return row ? toTask(row) : null
}

export async function updateTask(db: D1Database, id: number, input: TaskInput) {
  await db
    .prepare(
      `UPDATE tasks SET name = ?, every = ?, unit = ?, starts_on = ?, remind_days = ?, miles = ?, notes = ?,
         updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(...taskValues(input), id)
    .run()
}

export async function deleteTask(db: D1Database, id: number) {
  await db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run()
}
