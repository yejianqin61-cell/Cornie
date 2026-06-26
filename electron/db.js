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
    },
    // v5: observation logs
    (db) => {
      db.run(`
        create table if not exists observation_logs (
          id text primary key,
          date text not null,
          type text not null,
          title text not null,
          content text not null,
          related_ref text,
          source_text text,
          created_at integer not null,
          updated_at integer not null
        );
      `)

      db.run(`create index if not exists idx_observation_logs_date_created_at on observation_logs(date, created_at);`)
      db.run(`create index if not exists idx_observation_logs_date_type on observation_logs(date, type);`)
    },
    // v6: long-term memory
    (db) => {
      db.run(`
        create table if not exists memory_entries (
          id text primary key,
          kind text not null,
          title text not null,
          content text not null,
          tags_json text,
          source_text text,
          weight real default 1.0,
          is_active integer not null default 1,
          last_used_at integer,
          archived_at integer,
          superseded_by text,
          summary_group text,
          created_at integer not null,
          updated_at integer not null
        );
      `)

      db.run(`create index if not exists idx_memory_entries_active_weight on memory_entries(is_active, weight);`)
      db.run(`create index if not exists idx_memory_entries_kind_active on memory_entries(kind, is_active);`)
      db.run(`create index if not exists idx_memory_entries_summary_group on memory_entries(summary_group);`)
    },
    // v7: pending confirmations
    (db) => {
      db.run(`
        create table if not exists pending_confirmations (
          id text primary key,
          date text not null,
          conversation_message_id text not null,
          status text not null,
          source_text text,
          assistant_reply text,
          confirm_type text not null,
          tool_calls_json text not null,
          confirm_request_json text not null,
          created_at integer not null,
          updated_at integer not null,
          resolved_at integer
        );
      `)

      db.run(
        `create index if not exists idx_pending_confirmations_date_created_at on pending_confirmations(date, created_at);`
      )
      db.run(
        `create index if not exists idx_pending_confirmations_status_created_at on pending_confirmations(status, created_at);`
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

export function listConversationDates(store, { month } = {}) {
  const like = month ? `${month}-%` : null
  const stmt = store.db.prepare(
    like
      ? `
        select date, count(*) as messageCount
        from conversations
        where date like $like
        group by date
        order by date desc
      `
      : `
        select date, count(*) as messageCount
        from conversations
        group by date
        order by date desc
      `
  )
  if (like) {
    stmt.bind({ $like: like })
  }

  const rows = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      date: String(row.date),
      messageCount: Number(row.messageCount)
    })
  }
  stmt.free()
  return rows
}

// ─── on this day ──────────────────────────────────────────────

function parseJsonValue(text, fallback) {
  if (!text) return fallback
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

export function createPendingConfirmation(store, entry) {
  const now = Date.now()
  const finalId = entry.id || randomUUID()
  store.db.run(
    `
    insert into pending_confirmations(
      id, date, conversation_message_id, status, source_text, assistant_reply,
      confirm_type, tool_calls_json, confirm_request_json, created_at, updated_at, resolved_at
    ) values (
      $id, $date, $conversation_message_id, $status, $source_text, $assistant_reply,
      $confirm_type, $tool_calls_json, $confirm_request_json, $created_at, $updated_at, $resolved_at
    )
  `,
    {
      $id: finalId,
      $date: entry.date,
      $conversation_message_id: entry.conversationMessageId,
      $status: entry.status ?? 'pending',
      $source_text: entry.sourceText ?? null,
      $assistant_reply: entry.assistantReply ?? null,
      $confirm_type: entry.confirmType,
      $tool_calls_json: JSON.stringify(Array.isArray(entry.toolCalls) ? entry.toolCalls : []),
      $confirm_request_json: JSON.stringify(entry.confirmRequest ?? {}),
      $created_at: now,
      $updated_at: now,
      $resolved_at: entry.resolvedAt ?? null
    }
  )
  store.persist()
  return getPendingConfirmation(store, finalId)
}

export function getPendingConfirmation(store, id) {
  const stmt = store.db.prepare(
    `
    select id, date, conversation_message_id as conversationMessageId, status,
           source_text as sourceText, assistant_reply as assistantReply,
           confirm_type as confirmType, tool_calls_json as toolCallsJson,
           confirm_request_json as confirmRequestJson, created_at as createdAt,
           updated_at as updatedAt, resolved_at as resolvedAt
    from pending_confirmations
    where id = $id
  `
  )
  stmt.bind({ $id: id })
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  if (!row) return null
  return {
    id: String(row.id),
    date: String(row.date),
    conversationMessageId: String(row.conversationMessageId),
    status: String(row.status),
    sourceText: row.sourceText == null ? null : String(row.sourceText),
    assistantReply: row.assistantReply == null ? null : String(row.assistantReply),
    confirmType: String(row.confirmType),
    toolCalls: parseJsonValue(row.toolCallsJson, []),
    confirmRequest: parseJsonValue(row.confirmRequestJson, {}),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
    resolvedAt: row.resolvedAt == null ? null : Number(row.resolvedAt)
  }
}

export function updatePendingConfirmationStatus(store, { id, status, resolvedAt }) {
  const now = Date.now()
  store.db.run(
    `
    update pending_confirmations
    set status = $status,
        updated_at = $updated_at,
        resolved_at = coalesce($resolved_at, resolved_at)
    where id = $id
  `,
    {
      $id: id,
      $status: status,
      $updated_at: now,
      $resolved_at: resolvedAt ?? null
    }
  )
  store.persist()
  return getPendingConfirmation(store, id)
}

export function listPendingConfirmationsByDate(store, { date, status } = {}) {
  const where = []
  const params = {}
  if (date) {
    where.push('date = $date')
    params.$date = date
  }
  if (status) {
    where.push('status = $status')
    params.$status = status
  }

  const stmt = store.db.prepare(
    `
    select id, date, conversation_message_id as conversationMessageId, status,
           source_text as sourceText, assistant_reply as assistantReply,
           confirm_type as confirmType, tool_calls_json as toolCallsJson,
           confirm_request_json as confirmRequestJson, created_at as createdAt,
           updated_at as updatedAt, resolved_at as resolvedAt
    from pending_confirmations
    ${where.length ? `where ${where.join(' and ')}` : ''}
    order by created_at asc
  `
  )
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: String(row.id),
      date: String(row.date),
      conversationMessageId: String(row.conversationMessageId),
      status: String(row.status),
      sourceText: row.sourceText == null ? null : String(row.sourceText),
      assistantReply: row.assistantReply == null ? null : String(row.assistantReply),
      confirmType: String(row.confirmType),
      toolCalls: parseJsonValue(row.toolCallsJson, []),
      confirmRequest: parseJsonValue(row.confirmRequestJson, {}),
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt),
      resolvedAt: row.resolvedAt == null ? null : Number(row.resolvedAt)
    })
  }
  stmt.free()
  return rows
}

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

// ─── observation ───────────────────────────────────────────────────────────

export function saveObservationLog(store, entry) {
  const now = Date.now()
  const finalId = entry.id || randomUUID()
  store.db.run(
    `
    insert into observation_logs(
      id, date, type, title, content, related_ref, source_text, created_at, updated_at
    ) values (
      $id, $date, $type, $title, $content, $related_ref, $source_text, $created_at, $updated_at
    )
    on conflict(id) do update set
      date=excluded.date,
      type=excluded.type,
      title=excluded.title,
      content=excluded.content,
      related_ref=excluded.related_ref,
      source_text=excluded.source_text,
      updated_at=excluded.updated_at
  `,
    {
      $id: finalId,
      $date: entry.date,
      $type: entry.type,
      $title: entry.title,
      $content: entry.content,
      $related_ref: entry.relatedRef ?? null,
      $source_text: entry.sourceText ?? null,
      $created_at: now,
      $updated_at: now
    }
  )
  store.persist()
  return getObservationLog(store, finalId)
}

export function updateObservationLog(store, { id, date, type, title, content, relatedRef, sourceText }) {
  const now = Date.now()
  store.db.run(
    `
    update observation_logs
    set date = coalesce($date, date),
        type = coalesce($type, type),
        title = coalesce($title, title),
        content = coalesce($content, content),
        related_ref = coalesce($related_ref, related_ref),
        source_text = coalesce($source_text, source_text),
        updated_at = $updated_at
    where id = $id
  `,
    {
      $id: id,
      $date: date ?? null,
      $type: type ?? null,
      $title: title ?? null,
      $content: content ?? null,
      $related_ref: relatedRef ?? null,
      $source_text: sourceText ?? null,
      $updated_at: now
    }
  )
  store.persist()
  return getObservationLog(store, id)
}

export function deleteObservationLog(store, id) {
  store.db.run('delete from observation_logs where id = $id', { $id: id })
  store.persist()
}

export function getObservationLog(store, id) {
  const stmt = store.db.prepare(
    `select id, date, type, title, content, related_ref as relatedRef, source_text as sourceText, created_at as createdAt, updated_at as updatedAt from observation_logs where id = $id`
  )
  stmt.bind({ $id: id })
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  if (!row) return null
  return {
    id: String(row.id),
    date: String(row.date),
    type: String(row.type),
    title: String(row.title),
    content: String(row.content),
    relatedRef: row.relatedRef == null ? null : String(row.relatedRef),
    sourceText: row.sourceText == null ? null : String(row.sourceText),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt)
  }
}

export function listObservationLogs(store, { date, from, to, type, limit = 50 } = {}) {
  const where = []
  const params = { $limit: Math.max(1, Math.min(200, Number.parseInt(String(limit), 10) || 50)) }

  if (date) {
    where.push('date = $date')
    params.$date = date
  }
  if (from) {
    where.push('date >= $from')
    params.$from = from
  }
  if (to) {
    where.push('date <= $to')
    params.$to = to
  }
  if (type) {
    where.push('type = $type')
    params.$type = type
  }

  const sql = `
    select id, date, type, title, content, related_ref as relatedRef, source_text as sourceText, created_at as createdAt, updated_at as updatedAt
    from observation_logs
    ${where.length ? `where ${where.join(' and ')}` : ''}
    order by created_at desc
    limit $limit
  `
  const stmt = store.db.prepare(sql)
  stmt.bind(params)

  const rows = []
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      id: String(r.id),
      date: String(r.date),
      type: String(r.type),
      title: String(r.title),
      content: String(r.content),
      relatedRef: r.relatedRef == null ? null : String(r.relatedRef),
      sourceText: r.sourceText == null ? null : String(r.sourceText),
      createdAt: Number(r.createdAt),
      updatedAt: Number(r.updatedAt)
    })
  }
  stmt.free()
  return rows
}

// ─── memory ────────────────────────────────────────────────────────────────

function parseJsonArray(text) {
  if (!text) return []
  try {
    const value = JSON.parse(text)
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function saveMemoryEntry(store, entry) {
  const now = Date.now()
  const finalId = entry.id || randomUUID()
  const tagsJson = JSON.stringify(Array.isArray(entry.tags) ? entry.tags : [])
  store.db.run(
    `
    insert into memory_entries(
      id, kind, title, content, tags_json, source_text, weight, is_active,
      last_used_at, archived_at, superseded_by, summary_group, created_at, updated_at
    ) values (
      $id, $kind, $title, $content, $tags_json, $source_text, $weight, $is_active,
      $last_used_at, $archived_at, $superseded_by, $summary_group, $created_at, $updated_at
    )
    on conflict(id) do update set
      kind=excluded.kind,
      title=excluded.title,
      content=excluded.content,
      tags_json=excluded.tags_json,
      source_text=excluded.source_text,
      weight=excluded.weight,
      is_active=excluded.is_active,
      last_used_at=excluded.last_used_at,
      archived_at=excluded.archived_at,
      superseded_by=excluded.superseded_by,
      summary_group=excluded.summary_group,
      updated_at=excluded.updated_at
  `,
    {
      $id: finalId,
      $kind: entry.kind,
      $title: entry.title,
      $content: entry.content,
      $tags_json: tagsJson,
      $source_text: entry.sourceText ?? null,
      $weight: entry.weight ?? 1,
      $is_active: entry.isActive === false ? 0 : 1,
      $last_used_at: entry.lastUsedAt ?? null,
      $archived_at: entry.archivedAt ?? null,
      $superseded_by: entry.supersededBy ?? null,
      $summary_group: entry.summaryGroup ?? null,
      $created_at: now,
      $updated_at: now
    }
  )
  store.persist()
  return getMemoryEntry(store, finalId)
}

export function updateMemoryEntry(store, { id, kind, title, content, tags, sourceText, weight, isActive, lastUsedAt, archivedAt, supersededBy, summaryGroup }) {
  const now = Date.now()
  store.db.run(
    `
    update memory_entries
    set kind = coalesce($kind, kind),
        title = coalesce($title, title),
        content = coalesce($content, content),
        tags_json = coalesce($tags_json, tags_json),
        source_text = coalesce($source_text, source_text),
        weight = coalesce($weight, weight),
        is_active = coalesce($is_active, is_active),
        last_used_at = coalesce($last_used_at, last_used_at),
        archived_at = coalesce($archived_at, archived_at),
        superseded_by = coalesce($superseded_by, superseded_by),
        summary_group = coalesce($summary_group, summary_group),
        updated_at = $updated_at
    where id = $id
  `,
    {
      $id: id,
      $kind: kind ?? null,
      $title: title ?? null,
      $content: content ?? null,
      $tags_json: tags ? JSON.stringify(tags) : null,
      $source_text: sourceText ?? null,
      $weight: weight ?? null,
      $is_active: isActive === undefined ? null : isActive ? 1 : 0,
      $last_used_at: lastUsedAt ?? null,
      $archived_at: archivedAt ?? null,
      $superseded_by: supersededBy ?? null,
      $summary_group: summaryGroup ?? null,
      $updated_at: now
    }
  )
  store.persist()
  return getMemoryEntry(store, id)
}

export function deleteMemoryEntry(store, id) {
  store.db.run('delete from memory_entries where id = $id', { $id: id })
  store.persist()
}

export function getMemoryEntry(store, id) {
  const stmt = store.db.prepare(
    `select id, kind, title, content, tags_json as tagsJson, source_text as sourceText, weight, is_active as isActive, last_used_at as lastUsedAt, archived_at as archivedAt, superseded_by as supersededBy, summary_group as summaryGroup, created_at as createdAt, updated_at as updatedAt from memory_entries where id = $id`
  )
  stmt.bind({ $id: id })
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  if (!row) return null
  return {
    id: String(row.id),
    kind: String(row.kind),
    title: String(row.title),
    content: String(row.content),
    tags: parseJsonArray(row.tagsJson),
    sourceText: row.sourceText == null ? null : String(row.sourceText),
    weight: Number(row.weight ?? 1),
    isActive: Boolean(row.isActive),
    lastUsedAt: row.lastUsedAt == null ? null : Number(row.lastUsedAt),
    archivedAt: row.archivedAt == null ? null : Number(row.archivedAt),
    supersededBy: row.supersededBy == null ? null : String(row.supersededBy),
    summaryGroup: row.summaryGroup == null ? null : String(row.summaryGroup),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt)
  }
}

export function listActiveMemoryEntries(store, { kind, limit = 50 } = {}) {
  const where = ['is_active = 1']
  const params = { $limit: Math.max(1, Math.min(200, Number.parseInt(String(limit), 10) || 50)) }
  if (kind) {
    where.push('kind = $kind')
    params.$kind = kind
  }

  const stmt = store.db.prepare(
    `
    select id, kind, title, content, tags_json as tagsJson, source_text as sourceText, weight, is_active as isActive, last_used_at as lastUsedAt, archived_at as archivedAt, superseded_by as supersededBy, summary_group as summaryGroup, created_at as createdAt, updated_at as updatedAt
    from memory_entries
    where ${where.join(' and ')}
    order by weight desc, coalesce(last_used_at, created_at) desc
    limit $limit
  `
  )
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: String(row.id),
      kind: String(row.kind),
      title: String(row.title),
      content: String(row.content),
      tags: parseJsonArray(row.tagsJson),
      sourceText: row.sourceText == null ? null : String(row.sourceText),
      weight: Number(row.weight ?? 1),
      isActive: Boolean(row.isActive),
      lastUsedAt: row.lastUsedAt == null ? null : Number(row.lastUsedAt),
      archivedAt: row.archivedAt == null ? null : Number(row.archivedAt),
      supersededBy: row.supersededBy == null ? null : String(row.supersededBy),
      summaryGroup: row.summaryGroup == null ? null : String(row.summaryGroup),
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt)
    })
  }
  stmt.free()
  return rows
}

export function searchMemoryEntries(store, { query, tags = [], kind, limit = 5 } = {}) {
  const q = String(query ?? '').trim().toLowerCase()
  const normalizedTags = Array.isArray(tags)
    ? tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
    : []
  const entries = listActiveMemoryEntries(store, { kind, limit: 200 })

  const scored = entries
    .map((entry) => {
      const haystack = `${entry.title}\n${entry.content}\n${entry.tags.join(' ')}`.toLowerCase()
      let score = entry.weight || 1

      if (q) {
        const tokens = q.split(/\s+/).filter(Boolean)
        for (const token of tokens) {
          if (haystack.includes(token)) score += 2
        }
      }

      for (const tag of normalizedTags) {
        if (haystack.includes(tag)) score += 1.5
      }

      if (entry.lastUsedAt) {
        const ageDays = Math.max(0, (Date.now() - entry.lastUsedAt) / 86_400_000)
        score += Math.max(0, 1 - ageDays / 30) * 0.5
      }

      return { entry, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(10, Number.parseInt(String(limit), 10) || 5)))

  return scored.map(({ entry, score }) => ({ ...entry, score }))
}

export function touchMemoryEntry(store, id) {
  const now = Date.now()
  store.db.run(
    'update memory_entries set last_used_at = $last_used_at, updated_at = $updated_at where id = $id',
    { $id: id, $last_used_at: now, $updated_at: now }
  )
  store.persist()
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
    on conflict(id) do update set
      type=excluded.type,
      occurred_at=excluded.occurred_at,
      amount=excluded.amount,
      currency=excluded.currency,
      category_id=excluded.category_id,
      category_name=excluded.category_name,
      merchant=excluded.merchant,
      item=excluded.item,
      source_text=excluded.source_text,
      confidence=excluded.confidence,
      updated_at=excluded.updated_at
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

export function listLedgerEntries(store, { type, from, to } = {}) {
  const where = []
  const params = {}

  if (type) {
    where.push('type = $type')
    params.$type = type
  }
  if (from) {
    where.push('occurred_at >= $from')
    params.$from = from
  }
  if (to) {
    where.push('occurred_at <= $to')
    params.$to = to
  }

  const sql = `
    select id, type, occurred_at as occurredAt, amount, currency, category_id as categoryId, category_name as categoryName, merchant, item, source_text as sourceText, confidence, created_at as createdAt, updated_at as updatedAt
    from ledger_entries
    ${where.length ? `where ${where.join(' and ')}` : ''}
    order by occurred_at desc, created_at desc
  `
  const stmt = store.db.prepare(sql)
  stmt.bind(params)

  const rows = []
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      id: String(r.id),
      type: String(r.type),
      occurredAt: String(r.occurredAt),
      amount: Number(r.amount),
      currency: String(r.currency),
      categoryId: r.categoryId == null ? null : String(r.categoryId),
      categoryName: r.categoryName == null ? null : String(r.categoryName),
      merchant: r.merchant == null ? null : String(r.merchant),
      item: r.item == null ? null : String(r.item),
      sourceText: r.sourceText == null ? null : String(r.sourceText),
      confidence: r.confidence == null ? null : Number(r.confidence),
      createdAt: Number(r.createdAt),
      updatedAt: Number(r.updatedAt)
    })
  }
  stmt.free()
  return rows
}

