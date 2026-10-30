// Nightly copy of everything that can't be rebuilt, kept in KV for 30 days.
// D1's own Time Travel covers the last 7 days to the minute; this reaches
// further back and lives outside the database.

const TABLES = ['users', 'passkeys', 'groups', 'tasks']
const KEEP_DAYS = 30

export async function backup(env: Env) {
  const results = await env.DB.batch(TABLES.map((t) => env.DB.prepare(`SELECT * FROM ${t}`)))
  const dump = {
    takenAt: new Date().toISOString(),
    tables: Object.fromEntries(TABLES.map((t, i) => [t, results[i].results])),
  }
  const key = `backup-${dump.takenAt.slice(0, 10)}`
  await env.BACKUPS.put(key, JSON.stringify(dump), { expirationTtl: KEEP_DAYS * 86400 })

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`),
    env.DB.prepare(`DELETE FROM challenges WHERE expires_at < datetime('now')`),
  ])
  return key
}
