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
