export function compressMemoryHits(hits = []) {
  if (hits.length === 0) return '当前没有相关长期记忆。'
  return hits.slice(0, 5).map((item) => `- ${item.title}: ${item.content}`).join('\n')
}

export function buildMemoryPromptSummary(hits = []) {
  if (hits.length === 0) return '（暂无长期记忆可注入）'
  return hits.slice(0, 5).map((item) => `- ${item.title}`).join('\n')
}
