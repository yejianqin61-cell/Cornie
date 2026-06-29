import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { saveMessage } from '../electron/db.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'

async function run() {
  const harness = await createServiceHarness('task359-chatlog-archive-governance')
  const chatlog = createChatlogService(harness.store)

  const dates = [
    '2026-04-15',
    '2026-05-20',
    '2026-06-01',
    '2026-06-15',
    '2026-06-29',
    '2026-06-30'
  ]

  for (const [index, date] of dates.entries()) {
    saveMessage(harness.store, {
      id: `msg-${index}`,
      date,
      role: index % 2 === 0 ? 'user' : 'cornie',
      content: `聊天记录 ${date}`
    })
  }

  const allView = chatlog.listDates({ scope: 'all', limit: 20, cursor: 0 })
  assert(allView.filters.scope === 'all', '全部历史视角应显式返回 scope=all')
  assert(allView.entries.length === dates.length, '全部历史视角应返回全部日期')
  assert(allView.storage.capabilities.archiveScopes.includes('recent_30_days'), 'storage 能力应声明支持 recent_30_days')

  const monthView = chatlog.listDates({ scope: 'month', month: '2026-06', limit: 20, cursor: 0 })
  assert(monthView.filters.scope === 'month', '指定月份视角应返回 scope=month')
  assert(monthView.archiveScope.month === '2026-06', '月份视角应返回当前 month')
  assert(monthView.entries.every((item) => item.date.startsWith('2026-06-')), '月份视角只应返回该月日期')

  const recentView = chatlog.listDates({ scope: 'recent_30_days', limit: 20, cursor: 0 })
  assert(recentView.filters.scope === 'recent_30_days', '最近30天视角应返回对应 scope')
  assert(recentView.archiveScope.recentFromDate === '2026-06-01', '最近30天应按最新日期回推起点')
  assert(recentView.archiveScope.recentToDate === '2026-06-30', '最近30天应返回终点日期')
  assert(recentView.entries.every((item) => item.date >= '2026-06-01'), '最近30天视角不应包含更早日期')
  assert(!recentView.entries.some((item) => item.date === '2026-05-20'), '最近30天视角应排除窗口外日期')

  const exportPayload = chatlog.exportByMonth('2026-06', { format: 'json' })
  assert(exportPayload.meta.storage.capabilities.exportMonth === true, '导出结果应带驱动能力元信息')

  await harness.close()
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
