// 把某个类目在列表里上移或下移一位，返回需要改写 sortOrder 的类目（序号从 1 开始）。
// 类目的 sortOrder 可能全是 0（创建时的默认值），所以按位置重新编号，而不是简单交换数值。
export function planCategoryMove(categories, id, direction) {
  const ordered = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const index = ordered.findIndex((item) => item.id === id)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || target < 0 || target >= ordered.length) return []

  const next = [...ordered]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
    .map((item, position) => ({ id: item.id, sortOrder: position + 1, previous: item.sortOrder }))
    .filter((item) => item.sortOrder !== item.previous)
    .map(({ id: categoryId, sortOrder }) => ({ id: categoryId, sortOrder }))
}
