import path from 'node:path'

// 462：单写者队列（进程内 Promise 链串行化）。
// 用于 memory-wiki 各 JSON 索引的 read-modify-write，避免并发读改写丢更新。
// 用法：const enqueue = createSingleWriterQueue(); await enqueue(async () => { ...读写索引... })
export function createSingleWriterQueue() {
  let chain = Promise.resolve()

  return function enqueue(task) {
    const run = chain.then(() => task())
    // 吞掉前序任务的错误，保证队列继续推进；错误仍由调用方捕获。
    chain = run.then(
      () => {},
      () => {}
    )
    return run
  }
}

const sharedQueues = new Map()

// 同一个 JSON 文件在进程内只有一条队列：无论创建了多少个服务实例，对它的读改写都排在一起。
// 键为文件绝对路径；Windows 路径不区分大小写，统一转小写。
export function getSharedWriterQueue(filePath) {
  const resolved = path.resolve(filePath)
  const key = process.platform === 'win32' ? resolved.toLowerCase() : resolved
  let queue = sharedQueues.get(key)
  if (!queue) {
    queue = createSingleWriterQueue()
    sharedQueues.set(key, queue)
  }
  return queue
}
