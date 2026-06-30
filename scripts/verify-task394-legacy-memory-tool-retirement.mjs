import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { listTools, clearTools, registerTool } from '../electron/backend/tools/registry.js'
import { registerMemoryTools } from '../electron/backend/memory/tools.js'
import { createMemoryService } from '../electron/backend/memory/service.js'
import { evaluateToolCalls } from '../electron/backend/policy/toolPolicy.js'
import { searchMemoryEntries } from '../electron/db.js'

async function run() {
  const harness = await createServiceHarness('task394-legacy-memory-tool-retirement')

  try {
    clearTools()
    registerMemoryTools(harness.store, { registerTool })

    const runtimeToolNames = listTools().map((item) => item.name)
    assert(!runtimeToolNames.some((name) => name.startsWith('memory.')), 'runtime 不应再注册 legacy memory 工具', runtimeToolNames)

    const decision = evaluateToolCalls(
      [
        {
          tool_name: 'memory.create',
          arguments: {
            kind: 'preference',
            title: '喜欢猫咪',
            content: '主人喜欢猫咪'
          }
        }
      ],
      {
        sourceText: '我很喜欢猫咪',
        store: harness.store
      }
    )
    assert(decision.decision === 'deny', 'legacy memory 工具调用应被 deny', decision)
    assert(String(decision.reason ?? '').includes('Memory Wiki'), 'deny reason 应提示改用 Memory Wiki', decision)

    const memoryService = createMemoryService(harness.store)
    const created = memoryService.create({
      kind: 'event',
      title: '旧记忆兼容层',
      content: '这是保留在 memory_entries 里的历史兼容数据。'
    })
    assert(created?.id, '旧 memory_entries 兼容层仍应可直接写入数据')

    const matches = searchMemoryEntries(harness.store, { query: '兼容层', limit: 5 })
    assert(matches.some((item) => item.id === created.id), '旧 memory_entries 历史数据仍应可查询')

    console.log('verify-task394-legacy-memory-tool-retirement: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
