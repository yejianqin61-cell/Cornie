import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { calculateTopicHeat, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-topic-heat-108-'))

  try {
    const store = await createTopicIndexStore(tempRoot)

    const recentHeat = calculateTopicHeat(
      {
        keyword: '龙虾',
        dates: ['2026-06-27', '2026-06-26'],
        importance: 'high'
      },
      { now: new Date('2026-06-27T12:00:00.000Z') }
    )

    const staleHeat = calculateTopicHeat(
      {
        keyword: '旧话题',
        dates: ['2026-02-01'],
        importance: 'high'
      },
      { now: new Date('2026-06-27T12:00:00.000Z') }
    )

    const pinnedHeat = calculateTopicHeat(
      {
        keyword: '长期偏好',
        dates: ['2026-02-01'],
        importance: 'medium',
        pinned: true
      },
      { now: new Date('2026-06-27T12:00:00.000Z') }
    )

    assert.ok(recentHeat.heatScore > staleHeat.heatScore)
    assert.ok(pinnedHeat.heatScore > staleHeat.heatScore)

    await store.upsert({
      keyword: '旧话题',
      dates: ['2026-02-01'],
      importance: 'high'
    })
    await store.upsert({
      keyword: '龙虾',
      dates: ['2026-06-27', '2026-06-26'],
      importance: 'high',
      memoryPageIds: ['topic_lobster']
    })
    await store.upsert({
      keyword: '长期偏好',
      dates: ['2026-02-01'],
      importance: 'medium',
      pinned: true
    })

    const listed = await store.list()
    assert.equal(listed.length, 3, '应列出全部 3 个话题')
    const byKeyword = Object.fromEntries(listed.map((item) => [item.keyword, item]))
    assert.ok(typeof byKeyword['龙虾'].heatScore === 'number')
    assert.ok(typeof byKeyword['龙虾'].freshnessWeight === 'number')
    assert.ok(typeof byKeyword['龙虾'].ageDays === 'number')
    // 时间无关断言：pinned 话题热度不低于同龄普通话题（排序随真实时间衰减，不做绝对首位断言）
    assert.ok(
      byKeyword['长期偏好'].heatScore >= byKeyword['旧话题'].heatScore,
      'pinned 话题热度应不低于同龄普通话题'
    )

    console.log('verify-task108-topic-heat-decay: passed')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
