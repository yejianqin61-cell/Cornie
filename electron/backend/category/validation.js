const INVALID_CATEGORY_NAMES = new Set([
  '其他',
  '其它',
  '别的',
  '默认',
  '杂项',
  '随便',
  '这个',
  '那个',
  '新类目'
])

const CATEGORY_SYNONYMS = new Map([
  ['吃饭', '餐饮'],
  ['吃的', '餐饮'],
  ['饭钱', '餐饮'],
  ['饭', '餐饮'],
  ['坐车', '交通'],
  ['打车', '交通'],
  ['买东西', '购物'],
  ['购物消费', '购物']
])

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function applySynonym(value) {
  return CATEGORY_SYNONYMS.get(value) ?? value
}

function simplifyForCompare(value) {
  return applySynonym(value.replace(/\s+/g, '').toLowerCase())
}

export function normalizeCategoryName(name) {
  if (name == null) {
    return ''
  }

  return normalizeWhitespace(String(name).normalize('NFKC'))
}

function isSentenceLike(name) {
  if (/[，。！？；：,.!?]/.test(name) && name.length >= 8) {
    return true
  }

  return name.length > 12
}

function hasHighSimilarity(left, right) {
  const a = simplifyForCompare(left)
  const b = simplifyForCompare(right)
  if (!a || !b || a === b) {
    return false
  }

  return a.includes(b) || b.includes(a)
}

export function validateCategoryName(name, existingCategories = []) {
  const normalizedName = normalizeCategoryName(name)

  if (!normalizedName) {
    return {
      ok: false,
      normalizedName,
      reason: '类目名不能为空。',
      duplicateCategoryId: null,
      duplicateCategoryName: null,
      similarCandidates: []
    }
  }

  if (normalizedName.length > 24) {
    return {
      ok: false,
      normalizedName,
      reason: '类目名太长了，尽量控制在 24 个字以内。',
      duplicateCategoryId: null,
      duplicateCategoryName: null,
      similarCandidates: []
    }
  }

  if (INVALID_CATEGORY_NAMES.has(normalizedName)) {
    return {
      ok: false,
      normalizedName,
      reason: '这个类目名太泛了，最好再具体一点。',
      duplicateCategoryId: null,
      duplicateCategoryName: null,
      similarCandidates: []
    }
  }

  if (isSentenceLike(normalizedName)) {
    return {
      ok: false,
      normalizedName,
      reason: '这个名字更像一句描述，不太适合直接做类目名。',
      duplicateCategoryId: null,
      duplicateCategoryName: null,
      similarCandidates: []
    }
  }

  const normalizedCompare = simplifyForCompare(normalizedName)
  const exactDuplicate = existingCategories.find(
    (item) => simplifyForCompare(normalizeCategoryName(item.name)) === normalizedCompare
  )

  if (exactDuplicate) {
    return {
      ok: true,
      normalizedName,
      duplicateCategoryId: exactDuplicate.id,
      duplicateCategoryName: exactDuplicate.name,
      similarCandidates: []
    }
  }

  const similarCandidates = existingCategories
    .filter((item) => hasHighSimilarity(normalizedName, normalizeCategoryName(item.name)))
    .map((item) => ({ id: item.id, name: item.name }))
    .slice(0, 5)

  if (similarCandidates.length > 0) {
    return {
      ok: false,
      normalizedName,
      reason: '已经有比较接近的类目了，最好先确认是不是复用现有类目。',
      duplicateCategoryId: null,
      duplicateCategoryName: null,
      similarCandidates
    }
  }

  return {
    ok: true,
    normalizedName,
    duplicateCategoryId: null,
    duplicateCategoryName: null,
    similarCandidates: []
  }
}
