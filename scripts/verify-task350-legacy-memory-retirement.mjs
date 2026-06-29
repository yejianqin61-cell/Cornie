import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { listTools, clearTools, registerTool } from '../electron/backend/tools/registry.js'
import { registerMemoryTools } from '../electron/backend/memory/tools.js'
import { createMemoryService } from '../electron/backend/memory/service.js'
import { searchMemoryEntries } from '../electron/db.js'

async function run() {
  const harness = await createServiceHarness('task350-legacy-memory-retirement')

  const runtimeToolNames = listTools().map((item) => item.name)
  assert(!runtimeToolNames.some((name) => name.startsWith('memory.')), '主运行时不应再默认注册 legacy memory 工具', runtimeToolNames)

  const memoryService = createMemoryService(harness.store)
  const created = memoryService.create({
    kind: 'event',
    title: '旧记忆兼容测试',
    content: '这是旧 memory_entries 兼容层保留的数据。'
  })

  assert(created?.id, 'legacy memory service 仍应可单独创建数据')

  const matches = searchMemoryEntries(harness.store, { query: '兼容测试', limit: 5 })
  assert(matches.some((item) => item.id === created.id), 'legacy memory_entries 历史表应仍可查询')

  clearTools()
  registerMemoryTools(harness.store, { registerTool })
  const compatToolNames = listTools().map((item) => item.name)
  assert(compatToolNames.includes('memory.create'), '兼容层在显式注册时仍应保留 memory 工具')

  await harness.close()
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
