function normalizeString(value) {
  if (value == null) {
    return null
  }

  const normalized = String(value).trim()
  return normalized ? normalized : null
}

export function normalizeCategoryMapping(input) {
  return {
    categoryId: normalizeString(input.category_id ?? input.categoryId),
    categoryName: normalizeString(input.category_name ?? input.categoryName),
    needsNewCategory: input.needsNewCategory === true,
    proposedCategoryName: normalizeString(
      input.proposed_category_name ?? input.proposedCategoryName ?? input.categoryProposalName
    )
  }
}
