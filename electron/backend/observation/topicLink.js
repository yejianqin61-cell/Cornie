function normalizeString(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return normalizeString(value).toLowerCase()
}

function toObservationRef(observation) {
  return `${normalizeString(observation.date)}#${normalizeString(observation.id)}`
}

export function createObservationTopicLinkService({ observationService, topicIndex }) {
  if (!observationService) {
    throw new Error('observationService is required')
  }
  if (!topicIndex) {
    throw new Error('topicIndex is required')
  }

  return {
    async linkObservationToTopic({ observationId, keyword, aliases, importance, note, pageId }) {
      const normalizedKeyword = normalizeKey(keyword)
      if (!normalizedKeyword) {
        throw new Error('keyword is required')
      }

      const observation = observationService.get(observationId)
      if (!observation) {
        throw new Error(`observation not found: ${observationId}`)
      }

      const existing = await topicIndex.get(normalizedKeyword)
      const mergedAliases = Array.from(
        new Set([...(existing?.aliases ?? []), ...(Array.isArray(aliases) ? aliases : [])].map((item) => normalizeString(item)).filter(Boolean))
      )

      const upserted = await topicIndex.upsert({
        ...(existing ?? {}),
        keyword: existing?.keyword || normalizeString(keyword),
        normalizedKey: normalizedKeyword,
        aliases: mergedAliases,
        importance: importance ?? existing?.importance ?? 'medium',
        note: note ?? existing?.note ?? ''
      })

      const withDate = await topicIndex.addDateRef(normalizedKeyword, observation.date)
      const withObservation = await topicIndex.addObservationRef(normalizedKeyword, toObservationRef(observation))

      let finalEntry = withObservation
      if (pageId) {
        finalEntry = await topicIndex.linkPage(normalizedKeyword, pageId)
      }

      return {
        entry: finalEntry,
        observation,
        upserted,
        withDate
      }
    },

    buildObservationRef(observation) {
      return toObservationRef(observation)
    }
  }
}
