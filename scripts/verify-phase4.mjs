/**
 * Phase 4.2 全局验收脚本
 * 验证所有前端 API 模块端点响应
 */
import http from 'node:http'

const BASE = 'http://127.0.0.1:5174'
const PASS = 0
const FAIL = 0
const RESULTS = []

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const opts = { method, hostname: '127.0.0.1', port: 5174, path, headers: {} }
    if (body) {
      opts.headers['Content-Type'] = 'application/json'
    }
    const req = http.request(opts, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        let parsed = null
        try { parsed = JSON.parse(data) } catch {}
        resolve({ status: res.statusCode, data: parsed })
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

const SMOKE_TESTS = [
  // 聊天
  { name: 'GET /api/chatlog/views', fn: () => request('GET', '/api/chatlog/views') },
  { name: 'GET /api/chatlog/history/days', fn: () => request('GET', '/api/chatlog/history/days') },

  // 日记
  { name: 'GET /api/diary/entries', fn: () => request('GET', '/api/diary/entries') },
  { name: 'GET /api/diary/calendar-view', fn: () => request('GET', '/api/diary/calendar-view?year=2026&month=9') },
  { name: 'GET /api/diary/anniversaries', fn: () => request('GET', '/api/diary/anniversaries') },

  // 记账
  { name: 'GET /api/ledger/records', fn: () => request('GET', '/api/ledger/records') },

  // 日程
  { name: 'GET /api/schedule/events', fn: () => request('GET', '/api/schedule/events') },

  // 待办
  { name: 'GET /api/todo/items', fn: () => request('GET', '/api/todo/items') },

  // 观察
  { name: 'GET /api/observations', fn: () => request('GET', '/api/observations') },

  // 记忆维基
  { name: 'GET /api/memory-wiki/pages', fn: () => request('GET', '/api/memory-wiki/pages') },
  { name: 'GET /api/memory-wiki/topic-index', fn: () => request('GET', '/api/memory-wiki/topic-index') },
  { name: 'GET /api/memory-wiki/governance', fn: () => request('GET', '/api/memory-wiki/governance') },

  // 设置
  { name: 'GET /api/settings/model', fn: () => request('GET', '/api/settings/model') },

  // 用户/身份
  { name: 'GET /api/user/profile', fn: () => request('GET', '/api/user/profile') },
]

async function main() {
  console.log('=== Phase 4.2 全局验收 ===\n')

  for (const t of SMOKE_TESTS) {
    try {
      const res = await t.fn()
      const ok = res.status >= 200 && res.status < 500
      RESULTS.push({ name: t.name, ok, status: res.status })
      console.log(`${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${t.name} → ${res.status}`)
    } catch (e) {
      RESULTS.push({ name: t.name, ok: false, status: null, error: e.message })
      console.log(`\x1b[31m✗\x1b[0m ${t.name} → ${e.message}`)
    }
  }

  const passed = RESULTS.filter(r => r.ok).length
  const total = RESULTS.length
  console.log(`\n=== 结果: ${passed}/${total} 通过 ===`)
  process.exit(passed === total ? 0 : 1)
}

main()