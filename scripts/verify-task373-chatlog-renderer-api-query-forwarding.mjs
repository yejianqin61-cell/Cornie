import assert from 'node:assert/strict'

async function run() {
  const calls = []
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init })
    return {
      ok: true,
      status: 200,
      json: async () => ({
        messages: [],
        pagination: { cursor: '0', nextCursor: null, hasMore: false, pageSize: 100, total: 0 },
        storage: { driver: 'mock', queryContractVersion: 2 }
      })
    }
  }

  const { getChatlog } = await import('../src/renderer/api.js')

  await getChatlog('2026-06-30', {
    limit: 80,
    cursor: 20,
    query: '龙虾',
    beforeId: 'msg-5',
    mode: 'page'
  })

  assert.equal(calls.length, 1, '应发起一次请求')
  const requestUrl = new URL(calls[0].url)
  assert.equal(requestUrl.pathname, '/api/chatlogs/2026-06-30', '请求路径应命中单日聊天详情接口')
  assert.equal(requestUrl.searchParams.get('limit'), '80', '应透传 limit')
  assert.equal(requestUrl.searchParams.get('cursor'), '20', '应透传 cursor')
  assert.equal(requestUrl.searchParams.get('q'), '龙虾', '应把 query 映射为 q')
  assert.equal(requestUrl.searchParams.get('beforeId'), 'msg-5', '应透传 beforeId')
  assert.equal(requestUrl.searchParams.get('mode'), 'page', '应透传 mode')

  console.log('verify-task373-chatlog-renderer-api-query-forwarding: ok')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
