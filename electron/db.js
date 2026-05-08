import fs from 'node:fs'
import initSqlJs from 'sql.js'

function ensureSchema(db) {
  db.run(`
    create table if not exists meta (
      key text primary key,
      value text not null
    );
  `)

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
  ensureSchema(db)

  function persist() {
    const data = db.export()
    fs.writeFileSync(dbPath, Buffer.from(data))
  }

  // 轻量 schema 版本：只要结构有破坏性改动再升
  db.run(
    `
    insert into meta(key, value) values ('schema_version', '1')
    on conflict(key) do nothing;
  `
  )
  persist()

  return { db, persist, close: () => db.close() }
}

export function upsertUserText(store, { date, userText }) {
  const now = Date.now()
  store.db.run(
    `
    insert into diary_entries(date, user_text, cornie_text, updated_at)
    values ($date, $user_text, coalesce((select cornie_text from diary_entries where date=$date), ''), $updated_at)
    on conflict(date) do update set
      user_text=excluded.user_text,
      updated_at=excluded.updated_at
  `,
    { $date: date, $user_text: userText ?? '', $updated_at: now }
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

