import fs from 'node:fs'
import initSqlJs from 'sql.js'

function ensureMetaTable(db) {
  db.run(`
    create table if not exists meta (
      key text primary key,
      value text not null
    );
  `)
}

function getMeta(db, key) {
  const stmt = db.prepare('select value from meta where key = $key')
  stmt.bind({ $key: key })
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return row?.value !== undefined ? String(row.value) : null
}

function setMeta(db, key, value) {
  db.run(
    `
    insert into meta(key, value) values ($key, $value)
    on conflict(key) do update set value=excluded.value;
  `,
    { $key: key, $value: String(value) }
  )
}

function migrate(db) {
  ensureMetaTable(db)

  const migrations = [
    // v1
    (db) => {
      db.run(`
        create table if not exists diary_entries (
          date text primary key,
          user_text text,
          cornie_text text,
          updated_at integer not null
        );
      `)
      db.run(`create index if not exists idx_diary_entries_updated_at on diary_entries(updated_at);`)

      // 预留：后续接入“对话驱动生成日记”时用
      db.run(`
        create table if not exists conversations (
          id text primary key,
          date text not null,
          role text not null, -- user | cornie
          content text not null,
          created_at integer not null
        );
      `)
      db.run(`create index if not exists idx_conversations_date_created_at on conversations(date, created_at);`)
    },
    // v2: “往年今日”常用查询索引（按月日）
    (db) => {
      db.run(
        `create index if not exists idx_diary_entries_monthday on diary_entries(substr(date, 6, 5));`
      )
    }
  ]

  const current = Number.parseInt(getMeta(db, 'schema_version') ?? '0', 10) || 0
  const target = migrations.length

  for (let v = current; v < target; v++) {
    migrations[v](db)
    setMeta(db, 'schema_version', String(v + 1))
  }
}

function readFileIfExists(p) {
  try {
    return fs.readFileSync(p)
  } catch {
    return null
  }
}

export async function openDb(dbPath) {
  const SQL = await initSqlJs()
  const file = readFileIfExists(dbPath)
  const db = file ? new SQL.Database(file) : new SQL.Database()
  migrate(db)

  function persist() {
    const data = db.export()
    fs.writeFileSync(dbPath, Buffer.from(data))
  }

  persist()

  return { db, persist, close: () => db.close() }
}

export function upsertUserText(store, { date, userText, cornieText }) {
  const now = Date.now()
  const existing = getEntry(store, date)
  const finalCornie = cornieText !== undefined ? cornieText : existing.cornieText
  store.db.run(
    `
    insert into diary_entries(date, user_text, cornie_text, updated_at)
    values ($date, $user_text, $cornie_text, $updated_at)
    on conflict(date) do update set
      user_text=excluded.user_text,
      cornie_text=excluded.cornie_text,
      updated_at=excluded.updated_at
  `,
    { $date: date, $user_text: userText ?? '', $cornie_text: finalCornie, $updated_at: now }
  )
  store.persist()
  return getEntry(store, date)
}

export function setCornieText(store, { date, cornieText }) {
  const now = Date.now()
  store.db.run(
    `
    insert into diary_entries(date, user_text, cornie_text, updated_at)
    values ($date, coalesce((select user_text from diary_entries where date=$date), ''), $cornie_text, $updated_at)
    on conflict(date) do update set
      cornie_text=excluded.cornie_text,
      updated_at=excluded.updated_at
  `,
    { $date: date, $cornie_text: cornieText ?? '', $updated_at: now }
  )
  store.persist()
  return getEntry(store, date)
}

export function getEntry(store, date) {
  const stmt = store.db.prepare(
    'select date, user_text as userText, cornie_text as cornieText from diary_entries where date = $date'
  )
  stmt.bind({ $date: date })
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  if (row && row.date) {
    return {
      date: String(row.date),
      userText: String(row.userText ?? ''),
      cornieText: String(row.cornieText ?? '')
    }
  }
  return { date, userText: '', cornieText: '' }
}

export function listEntries(store, { month } = {}) {
  const like = month ? `${month}-%` : null
  const sql = like
    ? `
      select date,
             case when length(trim(coalesce(user_text,''))) > 0 then 1 else 0 end as hasUserText,
             case when length(trim(coalesce(cornie_text,''))) > 0 then 1 else 0 end as hasCornieText
      from diary_entries
      where date like $like
      order by date desc
    `
    : `
      select date,
             case when length(trim(coalesce(user_text,''))) > 0 then 1 else 0 end as hasUserText,
             case when length(trim(coalesce(cornie_text,''))) > 0 then 1 else 0 end as hasCornieText
      from diary_entries
      order by date desc
    `

  const stmt = store.db.prepare(sql)
  if (like) stmt.bind({ $like: like })

  const rows = []
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      date: String(r.date),
      hasUserText: Boolean(r.hasUserText),
      hasCornieText: Boolean(r.hasCornieText)
    })
  }
  stmt.free()
  return rows
}

// ─── conversations ────────────────────────────────────────────

export function saveMessage(store, { id, date, role, content }) {
  const now = Date.now()
  store.db.run(
    `insert into conversations(id, date, role, content, created_at) values ($id, $date, $role, $content, $created_at)`,
    { $id: id, $date: date, $role: role, $content: content, $created_at: now }
  )
  store.persist()
  return { id, date, role, content, createdAt: now }
}

export function getMessagesByDate(store, date) {
  const stmt = store.db.prepare(
    'select id, date, role, content, created_at as createdAt from conversations where date = $date order by created_at asc'
  )
  stmt.bind({ $date: date })
  const rows = []
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      id: String(r.id),
      date: String(r.date),
      role: String(r.role),
      content: String(r.content),
      createdAt: Number(r.createdAt)
    })
  }
  stmt.free()
  return rows
}

export function deleteMessagesByDate(store, date) {
  store.db.run('delete from conversations where date = $date', { $date: date })
  store.persist()
}

// ─── on this day ──────────────────────────────────────────────

export function listOnThisDay(store, { date, limit = 20 }) {
  const safeLimit = Math.max(1, Math.min(200, Number.parseInt(String(limit), 10) || 20))
  const stmt = store.db.prepare(
    `
    select date,
           user_text as userText,
           cornie_text as cornieText
    from diary_entries
    where substr(date, 6, 5) = substr($date, 6, 5)
      and date <> $date
      and (length(trim(coalesce(user_text,''))) > 0 or length(trim(coalesce(cornie_text,''))) > 0)
    order by date desc
    limit $limit
  `
  )
  stmt.bind({ $date: date, $limit: safeLimit })

  const rows = []
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      date: String(r.date),
      userText: String(r.userText ?? ''),
      cornieText: String(r.cornieText ?? '')
    })
  }
  stmt.free()
  return rows
}

