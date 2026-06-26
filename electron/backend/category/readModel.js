export function toCategoryListResult(items, { includeType = false } = {}) {
  const normalizedItems = Array.isArray(items)
    ? items.map((item) => ({
        id: item.id,
        name: item.name,
        status: item.isActive === false ? 'disabled' : 'active',
        ...(includeType && item.type ? { type: item.type } : {})
      }))
    : []

  return {
    items: normalizedItems,
    total: normalizedItems.length
  }
}
