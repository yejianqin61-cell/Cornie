import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
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
    },
    // v3: ledger tables
    (db) => {
      db.run(`
        create table if not exists ledger_categories (
          id text primary key,
          type text not null,
          name text not null,
          is_active integer not null default 1,
          sort_order integer not null default 0,
          created_at integer not null,
          updated_at integer not null
        );
      `)

      db.run(`
        create table if not exists ledger_entries (
          id text primary key,
          type text not null,
          occurred_at text not null,
          amount real not null,
          currency text not null,
          category_id text,
          category_name text,
          merchant text,
          item text,
          source_text text,
          confidence real,
          created_at integer not null,
          updated_at integer not null
        );
      `)

      db.run(`create index if not exists idx_ledger_entries_occurred_at on ledger_entries(occurred_at);`)
      db.run(`create index if not exists idx_ledger_entries_type on ledger_entries(type);`)
      db.run(
        `create index if not exists idx_ledger_categories_type_active on ledger_categories(type, is_active);`
      )

      const now = Date.now()
      const seedCategories = [
        ['expense', '餐饮', 'exp_food', 10],
        ['expense', '交通', 'exp_transport', 20],
        ['expense', '购物', 'exp_shopping', 30],
        ['expense', '娱乐', 'exp_entertainment', 40],
        ['income', '工资', 'inc_salary', 10],
        ['income', '红包', 'inc_redpacket', 20]
      ]

      for (const [type, name, id, sortOrder] of seedCategories) {
        db.run(
          `
          insert into ledger_categories(id, type, name, is_active, sort_order, created_at, updated_at)
          values ($id, $type, $name, 1, $sort_order, $created_at, $updated_at)
          on conflict(id) do nothing
        `,
          {
            $id: id,
            $type: type,
            $name: name,
            $sort_order: sortOrder,
            $created_at: now,
            $updated_at: now
          }
        )
      }
    },
    // v4: todo and schedule tables
    (db) => {
      db.run(`
        create table if not exists todo_categories (
          id text primary key,
          name text not null,
          is_active integer not null default 1,
          sort_order integer not null default 0,
          created_at integer not null,
          updated_at integer not null
        );
      `)

      db.run(`
        create table if not exists todo_entries (
          id text primary key,
          title text not null,
          description text,
          category_id text,
          category_name text,
          due_at text,
          status text not null,
          source_text text,
          created_at integer not null,
          updated_at integer not null
        );
      `)

      db.run(`
        create table if not exists schedule_categories (
          id text primary key,
          name text not null,
          is_active integer not null default 1,
          sort_order integer not null default 0,
          created_at integer not null,
          updated_at integer not null
        );
      `)

      db.run(`
        create table if not exists schedule_entries (
          id text primary key,
          title text not null,
          description text,
          category_id text,
          category_name text,
          start_at text not null,
          end_at text,
          status text not null,
          location text,
          source_text text,
          created_at integer not null,
          updated_at integer not null
        );
      `)

      db.run(`create index if not exists idx_todo_entries_status_due on todo_entries(status, due_at);`)
      db.run(`create index if not exists idx_todo_entries_due_at on todo_entries(due_at);`)
      db.run(
        `create index if not exists idx_todo_categories_active on todo_categories(is_active, sort_order);`
      )
      db.run(`create index if not exists idx_schedule_entries_start_at on schedule_entries(start_at);`)
      db.run(
        `create index if not exists idx_schedule_categories_active on schedule_categories(is_active, sort_order);`
      )

      const now = Date.now()
      const todoSeeds = [
        ['待办', 'todo_general', 10],
        ['学习', 'todo_study', 20],
        ['生活', 'todo_life', 30]
      ]
      for (const [name, id, sortOrder] of todoSeeds) {
        db.run(
          `
          insert into todo_categories(id, name, is_active, sort_order, created_at, updated_at)
          values ($id, $name, 1, $sort_order, $created_at, $updated_at)
          on conflict(id) do nothing
        `,
          {
            $id: id,
            $name: name,
            $sort_order: sortOrder,
            $created_at: now,
            $updated_at: now
          }
        )
      }

      const scheduleSeeds = [
        ['日程', 'schedule_general', 10],
        ['会议', 'schedule_meeting', 20],
        ['提醒', 'schedule_reminder', 30]
      ]
      for (const [name, id, sortOrder] of scheduleSeeds) {
        db.run(
          `
          insert into schedule_categories(id, name, is_active, sort_order, created_at, updated_at)
          values ($id, $name, 1, $sort_order, $created_at, $updated_at)
          on conflict(id) do nothing
        `,
          {
            $id: id,
            $name: name,
            $sort_order: sortOrder,
            $created_at: now,
            $updated_at: now
          }
        )
      }
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

// ─── todo ──────────────────────────────────────────────────────────────────

export function listTodoCategories(store, { activeOnly = true } = {}) {
  const sql = `
    select id, name, is_active as isActive, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
    from todo_categories
    ${activeOnly ? 'where is_active = 1' : ''}
    order by sort_order asc, created_at asc
  `
  const stmt = store.db.prepare(sql)
  const rows = []
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      id: String(r.id),
      name: String(r.name),
      isActive: Boolean(r.isActive),
      sortOrder: Number(r.sortOrder),
      createdAt: Number(r.createdAt),
      updatedAt: Number(r.updatedAt)
    })
  }
  stmt.free()
  return rows
}

export function upsertTodoCategory(store, { id, name, isActive = true, sortOrder = 0 }) {
  const now = Date.now()
  const finalId = id || randomUUID()
  store.db.run(
    `
    insert into todo_categories(id, name, is_active, sort_order, created_at, updated_at)
    values ($id, $name, $is_active, $sort_order, $created_at, $updated_at)
    on conflict(id) do update set
      name=excluded.name,
      is_active=excluded.is_active,
      sort_order=excluded.sort_order,
      updated_at=excluded.updated_at
  `,
    {
      $id: finalId,
      $name: name,
      $is_active: isActive ? 1 : 0,
      $sort_order: sortOrder,
      $created_at: now,
      $updated_at: now
    }
  )
  store.persist()
  return getTodoCategory(store, finalId)
}

export function getTodoCategory(store, id) {
  const stmt = store.db.prepare(
    'select id, name, is_active as isActive, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt from todo_categories where id = $id'
  )
  stmt.bind({ $id: id })
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  if (!row) return null
  return {
    id: String(row.id),
    name: String(row.name),
    isActive: Boolean(row.isActive),
    sortOrder: Number(row.sortOrder),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt)
  }
}

export function saveTodoEntry(store, entry) {
  const now = Date.now()
  const finalId = entry.id || randomUUID()
  store.db.run(
    `
    insert into todo_entries(
      id, title, description, category_id, category_name, due_at, status, source_text, created_at, updated_at
    ) values (
      $id, $title, $description, $category_id, $category_name, $due_at, $status, $source_text, $created_at, $updated_at
    )
    on conflict(id) do update set
      title=excluded.title,
      description=excluded.description,
      category_id=excluded.category_id,
      category_name=excluded.category_name,
      due_at=excluded.due_at,
      status=excluded.status,
      source_text=excluded.source_text,
      updated_at=excluded.updated_at
  `,
    {
      $id: finalId,
      $title: entry.title,
      $description: entry.description ?? null,
      $category_id: entry.categoryId ?? null,
      $category_name: entry.categoryName ?? null,
      $due_at: entry.dueAt ?? null,
      $status: entry.status,
      $source_text: entry.sourceText ?? null,
      $created_at: now,
      $updated_at: now
    }
  )
  store.persist()
  return getTodoEntry(store, finalId)
}

export function updateTodoEntryStatus(store, { id, status }) {
  const now = Date.now()
  store.db.run(
    `
    update todo_entries
    set status = $status,
        updated_at = $updated_at
    where id = $id
  `,
    { $id: id, $status: status, $updated_at: now }
  )
  store.persist()
  return getTodoEntry(store, id)
}

export function getTodoEntry(store, id) {
  const stmt = store.db.prepare(
    `select id, title, description, category_id as categoryId, category_name as categoryName, due_at as dueAt, status, source_text as sourceText, created_at as createdAt, updated_at as updatedAt from todo_entries where id = $id`
  )
  stmt.bind({ $id: id })
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  if (!row) return null
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description == null ? null : String(row.description),
    categoryId: row.categoryId == null ? null : String(row.categoryId),
    categoryName: row.categoryName == null ? null : String(row.categoryName),
    dueAt: row.dueAt == null ? null : String(row.dueAt),
    status: String(row.status),
    sourceText: row.sourceText == null ? null : String(row.sourceText),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt)
  }
}

export function listTodoEntries(store, { status, from, to } = {}) {
  const where = []
  const params = {}
  if (status) {
    where.push('status = $status')
    params.$status = status
  }
  if (from) {
    where.push('coalesce(due_at, created_at) >= $from')
    params.$from = from
  }
  if (to) {
    where.push('coalesce(due_at, created_at) <= $to')
    params.$to = to
  }
  const sql = `
    select id, title, description, category_id as categoryId, category_name as categoryName, due_at as dueAt, status, source_text as sourceText, created_at as createdAt, updated_at as updatedAt
    from todo_entries
    ${where.length ? `where ${where.join(' and ')}` : ''}
    order by coalesce(due_at, created_at) asc, created_at asc
  `
  const stmt = store.db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      id: String(r.id),
      title: String(r.title),
      description: r.description == null ? null : String(r.description),
      categoryId: r.categoryId == null ? null : String(r.categoryId),
      categoryName: r.categoryName == null ? null : String(r.categoryName),
      dueAt: r.dueAt == null ? null : String(r.dueAt),
      status: String(r.status),
      sourceText: r.sourceText == null ? null : String(r.sourceText),
      createdAt: Number(r.createdAt),
      updatedAt: Number(r.updatedAt)
    })
  }
  stmt.free()
  return rows
}

// ─── schedule ─────────────────────────────────────────────────────────────

export function listScheduleCategories(store, { activeOnly = true } = {}) {
  const sql = `
    select id, name, is_active as isActive, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
    from schedule_categories
    ${activeOnly ? 'where is_active = 1' : ''}
    order by sort_order asc, created_at asc
  `
  const stmt = store.db.prepare(sql)
  const rows = []
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      id: String(r.id),
      name: String(r.name),
      isActive: Boolean(r.isActive),
      sortOrder: Number(r.sortOrder),
      createdAt: Number(r.createdAt),
      updatedAt: Number(r.updatedAt)
    })
  }
  stmt.free()
  return rows
}

export function upsertScheduleCategory(store, { id, name, isActive = true, sortOrder = 0 }) {
  const now = Date.now()
  const finalId = id || randomUUID()
  store.db.run(
    `
    insert into schedule_categories(id, name, is_active, sort_order, created_at, updated_at)
    values ($id, $name, $is_active, $sort_order, $created_at, $updated_at)
    on conflict(id) do update set
      name=excluded.name,
      is_active=excluded.is_active,
      sort_order=excluded.sort_order,
      updated_at=excluded.updated_at
  `,
    {
      $id: finalId,
      $name: name,
      $is_active: isActive ? 1 : 0,
      $sort_order: sortOrder,
      $created_at: now,
      $updated_at: now
    }
  )
  store.persist()
  return getScheduleCategory(store, finalId)
}

export function getScheduleCategory(store, id) {
  const stmt = store.db.prepare(
    'select id, name, is_active as isActive, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt from schedule_categories where id = $id'
  )
  stmt.bind({ $id: id })
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  if (!row) return null
  return {
    id: String(row.id),
    name: String(row.name),
    isActive: Boolean(row.isActive),
    sortOrder: Number(row.sortOrder),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt)
  }
}

export function saveScheduleEntry(store, entry) {
  const now = Date.now()
  const finalId = entry.id || randomUUID()
  store.db.run(
    `
    insert into schedule_entries(
      id, title, description, category_id, category_name, start_at, end_at, status, location, source_text, created_at, updated_at
    ) values (
      $id, $title, $description, $category_id, $category_name, $start_at, $end_at, $status, $location, $source_text, $created_at, $updated_at
    )
    on conflict(id) do update set
      title=excluded.title,
      description=excluded.description,
      category_id=excluded.category_id,
      category_name=excluded.category_name,
      start_at=excluded.start_at,
      end_at=excluded.end_at,
      status=excluded.status,
      location=excluded.location,
      source_text=excluded.source_text,
      updated_at=excluded.updated_at
  `,
    {
      $id: finalId,
      $title: entry.title,
      $description: entry.description ?? null,
      $category_id: entry.categoryId ?? null,
      $category_name: entry.categoryName ?? null,
      $start_at: entry.startAt,
      $end_at: entry.endAt ?? null,
      $status: entry.status,
      $location: entry.location ?? null,
      $source_text: entry.sourceText ?? null,
      $created_at: now,
      $updated_at: now
    }
  )
  store.persist()
  return getScheduleEntry(store, finalId)
}

export function updateScheduleEntryStatus(store, { id, status }) {
  const now = Date.now()
  store.db.run(
    `
    update schedule_entries
    set status = $status,
        updated_at = $updated_at
    where id = $id
  `,
    { $id: id, $status: status, $updated_at: now }
  )
  store.persist()
  return getScheduleEntry(store, id)
}

export function getScheduleEntry(store, id) {
  const stmt = store.db.prepare(
    `select id, title, description, category_id as categoryId, category_name as categoryName, start_at as startAt, end_at as endAt, status, location, source_text as sourceText, created_at as createdAt, updated_at as updatedAt from schedule_entries where id = $id`
  )
  stmt.bind({ $id: id })
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  if (!row) return null
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description == null ? null : String(row.description),
    categoryId: row.categoryId == null ? null : String(row.categoryId),
    categoryName: row.categoryName == null ? null : String(row.categoryName),
    startAt: String(row.startAt),
    endAt: row.endAt == null ? null : String(row.endAt),
    status: String(row.status),
    location: row.location == null ? null : String(row.location),
    sourceText: row.sourceText == null ? null : String(row.sourceText),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt)
  }
}

export function listScheduleEntries(store, { status, from, to } = {}) {
  const where = []
  const params = {}
  if (status) {
    where.push('status = $status')
    params.$status = status
  }
  if (from) {
    where.push('start_at >= $from')
    params.$from = from
  }
  if (to) {
    where.push('start_at <= $to')
    params.$to = to
  }
  const sql = `
    select id, title, description, category_id as categoryId, category_name as categoryName, start_at as startAt, end_at as endAt, status, location, source_text as sourceText, created_at as createdAt, updated_at as updatedAt
    from schedule_entries
    ${where.length ? `where ${where.join(' and ')}` : ''}
    order by start_at asc, created_at asc
  `
  const stmt = store.db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      id: String(r.id),
      title: String(r.title),
      description: r.description == null ? null : String(r.description),
      categoryId: r.categoryId == null ? null : String(r.categoryId),
      categoryName: r.categoryName == null ? null : String(r.categoryName),
      startAt: String(r.startAt),
      endAt: r.endAt == null ? null : String(r.endAt),
      status: String(r.status),
      location: r.location == null ? null : String(r.location),
      sourceText: r.sourceText == null ? null : String(r.sourceText),
      createdAt: Number(r.createdAt),
      updatedAt: Number(r.updatedAt)
    })
  }
  stmt.free()
  return rows
}

// ─── ledger ────────────────────────────────────────────────────────────────

export function listLedgerCategories(store, { type, activeOnly = true } = {}) {
  const where = []
  const params = {}

  if (type) {
    where.push('type = $type')
    params.$type = type
  }

  if (activeOnly) {
    where.push('is_active = 1')
  }

  const sql = `
    select id, type, name, is_active as isActive, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
    from ledger_categories
    ${where.length > 0 ? `where ${where.join(' and ')}` : ''}
    order by sort_order asc, created_at asc
  `

  const stmt = store.db.prepare(sql)
  stmt.bind(params)

  const rows = []
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      id: String(r.id),
      type: String(r.type),
      name: String(r.name),
      isActive: Boolean(r.isActive),
      sortOrder: Number(r.sortOrder),
      createdAt: Number(r.createdAt),
      updatedAt: Number(r.updatedAt)
    })
  }
  stmt.free()
  return rows
}

export function upsertLedgerCategory(store, { id, type, name, isActive = true, sortOrder = 0 }) {
  const now = Date.now()
  const finalId = id || randomUUID()
  store.db.run(
    `
    insert into ledger_categories(id, type, name, is_active, sort_order, created_at, updated_at)
    values ($id, $type, $name, $is_active, $sort_order, $created_at, $updated_at)
    on conflict(id) do update set
      type=excluded.type,
      name=excluded.name,
      is_active=excluded.is_active,
      sort_order=excluded.sort_order,
      updated_at=excluded.updated_at
  `,
    {
      $id: finalId,
      $type: type,
      $name: name,
      $is_active: isActive ? 1 : 0,
      $sort_order: sortOrder,
      $created_at: now,
      $updated_at: now
    }
  )
  store.persist()
  return getLedgerCategory(store, finalId)
}

export function getLedgerCategory(store, id) {
  const stmt = store.db.prepare(
    'select id, type, name, is_active as isActive, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt from ledger_categories where id = $id'
  )
  stmt.bind({ $id: id })
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  if (!row) return null
  return {
    id: String(row.id),
    type: String(row.type),
    name: String(row.name),
    isActive: Boolean(row.isActive),
    sortOrder: Number(row.sortOrder),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt)
  }
}

export function saveLedgerEntry(store, entry) {
  const now = Date.now()
  const finalId = entry.id || randomUUID()
  store.db.run(
    `
    insert into ledger_entries(
      id, type, occurred_at, amount, currency, category_id, category_name, merchant, item,
      source_text, confidence, created_at, updated_at
    ) values (
      $id, $type, $occurred_at, $amount, $currency, $category_id, $category_name, $merchant, $item,
      $source_text, $confidence, $created_at, $updated_at
    )
  `,
    {
      $id: finalId,
      $type: entry.type,
      $occurred_at: entry.occurredAt,
      $amount: entry.amount,
      $currency: entry.currency ?? 'CNY',
      $category_id: entry.categoryId ?? null,
      $category_name: entry.categoryName ?? null,
      $merchant: entry.merchant ?? null,
      $item: entry.item ?? null,
      $source_text: entry.sourceText ?? null,
      $confidence: entry.confidence ?? null,
      $created_at: now,
      $updated_at: now
    }
  )
  store.persist()
  return getLedgerEntry(store, finalId)
}

export function getLedgerEntry(store, id) {
  const stmt = store.db.prepare(
    `select id, type, occurred_at as occurredAt, amount, currency, category_id as categoryId, category_name as categoryName, merchant, item, source_text as sourceText, confidence, created_at as createdAt, updated_at as updatedAt from ledger_entries where id = $id`
  )
  stmt.bind({ $id: id })
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  if (!row) return null
  return {
    id: String(row.id),
    type: String(row.type),
    occurredAt: String(row.occurredAt),
    amount: Number(row.amount),
    currency: String(row.currency),
    categoryId: row.categoryId == null ? null : String(row.categoryId),
    categoryName: row.categoryName == null ? null : String(row.categoryName),
    merchant: row.merchant == null ? null : String(row.merchant),
    item: row.item == null ? null : String(row.item),
    sourceText: row.sourceText == null ? null : String(row.sourceText),
    confidence: row.confidence == null ? null : Number(row.confidence),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt)
  }
}

