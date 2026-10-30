import type { Group, GroupInput, Kind, Task, TaskInput, Unit } from '../shared/types'

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

export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function listGroups(db: D1Database) {
  const [groups, tasks] = await db.batch([
    db.prepare('SELECT * FROM groups ORDER BY archived_at IS NOT NULL, name'),
    db.prepare('SELECT * FROM tasks ORDER BY name'),
  ])
  const all = (tasks.results as TaskRow[]).map(toTask)
  return (groups.results as GroupRow[]).map((g) => toGroup(g, all))
}

export async function getGroup(db: D1Database, id: number) {
  const row = await db.prepare('SELECT * FROM groups WHERE id = ?').bind(id).first<GroupRow>()
  if (!row) return null
  const { results } = await db.prepare('SELECT * FROM tasks WHERE group_id = ? ORDER BY name').bind(id).all<TaskRow>()
  return toGroup(row, results.map(toTask))
}

export async function groupByToken(db: D1Database, token: string) {
  const row = await db.prepare('SELECT id FROM groups WHERE token = ?').bind(token).first<{ id: number }>()
  return row ? getGroup(db, row.id) : null
}

export async function createGroup(db: D1Database, input: GroupInput) {
  const row = await db
    .prepare('INSERT INTO groups (name, kind, token) VALUES (?, ?, ?) RETURNING id')
    .bind(input.name, input.kind, newToken())
    .first<{ id: number }>()
  return row!.id
}

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
  await db.prepare('UPDATE groups SET token = ? WHERE id = ?').bind(newToken(), id).run()
}

export async function deleteGroup(db: D1Database, id: number) {
  await db.prepare('DELETE FROM groups WHERE id = ?').bind(id).run()
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

export async function getTask(db: D1Database, id: number) {
  const row = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first<TaskRow>()
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
