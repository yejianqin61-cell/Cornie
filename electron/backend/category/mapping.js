function normalizeString(value) {
  if (value == null) {
    return null
  }

  const normalized = String(value).trim()
  return normalized ? normalized : null
}

function normalizeCompareValue(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim()
}

const LOW_SIGNAL_CATEGORY_NAMES = new Set(['待办', '日程', '提醒', '默认', '其他', '其它'])

function isLowSignalCategoryName(value) {
  const normalized = normalizeString(value)
  return normalized ? LOW_SIGNAL_CATEGORY_NAMES.has(normalized) : false
}

function tokenize(value) {
  const normalized = normalizeCompareValue(value)
  if (!normalized) {
    return []
  }

  const parts = normalized.split(/[^a-z0-9\u4e00-\u9fa5]+/).filter(Boolean)
  const chars = [...new Set(normalized.split(''))].filter(Boolean)
  const bigrams = []
  for (let index = 0; index < normalized.length - 1; index += 1) {
    const gram = normalized.slice(index, index + 2)
    if (gram.trim()) {
      bigrams.push(gram)
    }
  }

  return [...new Set([...parts, ...bigrams, ...chars])].filter(Boolean)
}

function calculateOverlapScore(left, right) {
  const leftTokens = tokenize(left).filter((token) => token.length >= 2)
  const rightTokens = tokenize(right).filter((token) => token.length >= 2)
  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0
  }

  const matchedCount = leftTokens.filter((token) => rightTokens.includes(token)).length
  if (matchedCount === 0) {
    return 0
  }

  const ratio = matchedCount / Math.max(leftTokens.length, rightTokens.length)
  return Number(ratio.toFixed(2))
}

function buildReason(reasonParts) {
  return reasonParts.length > 0 ? reasonParts.join('，') : '未命中有效规则'
}

function buildCandidate(category, mapping) {
  const candidateName = normalizeString(category?.name)
  if (!candidateName) {
    return null
  }

  const normalizedCandidate = normalizeCompareValue(candidateName)
  const categoryTokens = tokenize(candidateName)
  const lowSignalCategory = isLowSignalCategoryName(candidateName)
  const scoreReasons = []
  let score = 0

  if (mapping.categoryId && mapping.categoryId === category.id) {
    score = 1
    scoreReasons.push('类目 ID 精确命中')
  }

  if (mapping.categoryName) {
    const normalizedProvidedName = normalizeCompareValue(mapping.categoryName)

    if (normalizedProvidedName && normalizedProvidedName === normalizedCandidate) {
      score = Math.max(score, 0.98)
      scoreReasons.push('类目名称精确命中')
    } else if (
      normalizedProvidedName &&
      normalizedProvidedName.length >= 2 &&
      normalizedCandidate.length >= 2 &&
      (normalizedCandidate.includes(normalizedProvidedName) ||
        normalizedProvidedName.includes(normalizedCandidate))
    ) {
      score = Math.max(score, 0.72)
      scoreReasons.push('类目名称部分命中')
    } else {
      const overlapScore = calculateOverlapScore(mapping.categoryName, candidateName)
      if (overlapScore >= 0.25) {
        score = Math.max(score, Math.min(0.8, 0.35 + overlapScore))
        scoreReasons.push(`类目名称存在关键词重叠(${overlapScore})`)
      }
    }
  }

  if (mapping.sourceText) {
    const normalizedSource = normalizeCompareValue(mapping.sourceText)
    if (normalizedSource && normalizedSource.includes(normalizedCandidate)) {
      const directSourceHitScore = lowSignalCategory ? 0.42 : 0.92
      score = Math.max(score, directSourceHitScore)
      scoreReasons.push(
        lowSignalCategory ? '原始文本包含通用类目词，降低置信度处理' : '原始文本直接包含类目名'
      )
    } else if (categoryTokens.length > 0) {
      const matchedTokens = categoryTokens.filter(
        (token) => token.length >= 2 && normalizedSource.includes(token)
      )
      if (matchedTokens.length > 0) {
        const tokenScoreBase = lowSignalCategory ? 0.22 : 0.45
        const tokenScoreCap = lowSignalCategory ? 0.48 : 0.84
        const tokenScore = Math.min(tokenScoreCap, tokenScoreBase + matchedTokens.length * 0.12)
        score = Math.max(score, tokenScore)
        scoreReasons.push(
          lowSignalCategory
            ? `原始文本命中通用类目词：${matchedTokens.join('、')}`
            : `原始文本命中关键词：${matchedTokens.join('、')}`
        )
      }
    }
  }

  if (score <= 0) {
    return null
  }

  return {
    id: category.id,
    name: category.name,
    score: Number(score.toFixed(2)),
    reason: buildReason(scoreReasons)
  }
}

function classifyMatch(candidates) {
  if (candidates.length === 0) {
    return {
      status: 'unmatched',
      selectedCandidate: null,
      confidence: 0,
      decisionHint: 'ask_back',
      reason: '没有找到可信的现有类目候选'
    }
  }

  const [top, second] = candidates
  const confidence = top.score
  const scoreGap = second ? Number((top.score - second.score).toFixed(2)) : top.score

  if (confidence >= 0.85 && scoreGap >= 0.15) {
    return {
      status: 'matched',
      selectedCandidate: top,
      confidence,
      decisionHint: 'allow',
      reason: `首选类目“${top.name}”命中度高，且与次选差距明显`
    }
  }

  if (confidence >= 0.55) {
    return {
      status: 'ambiguous',
      selectedCandidate: top,
      confidence,
      decisionHint: 'confirm',
      reason: second
        ? `首选类目“${top.name}”与其他候选接近，需要确认`
        : `首选类目“${top.name}”命中度中等，需要确认`
    }
  }

  return {
    status: 'unmatched',
    selectedCandidate: top,
    confidence,
    decisionHint: 'ask_back',
    reason: '现有候选命中度偏低，不足以自动判断'
  }
}

export function normalizeCategoryMapping(input) {
  return {
    categoryId: normalizeString(input.category_id ?? input.categoryId),
    categoryName: normalizeString(input.category_name ?? input.categoryName),
    needsNewCategory: input.needsNewCategory === true,
    proposedCategoryName: normalizeString(
      input.proposed_category_name ?? input.proposedCategoryName ?? input.categoryProposalName
    ),
    sourceText: normalizeString(input.source_text ?? input.sourceText)
  }
}

export function resolveCategoryCandidates(categories, input, domain) {
  const mapping = normalizeCategoryMapping(input)
  const candidates = (Array.isArray(categories) ? categories : [])
    .map((item) => buildCandidate(item, mapping))
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || String(left.name).localeCompare(String(right.name)))
    .slice(0, 5)

  const classification = classifyMatch(candidates)

  return {
    domain,
    status: classification.status,
    selectedCandidate: classification.selectedCandidate,
    candidates,
    confidence: classification.confidence,
    decisionHint: classification.decisionHint,
    reason: classification.reason
  }
}
