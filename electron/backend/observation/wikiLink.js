function normalizeString(value) {
  return String(value ?? '').trim()
}

function toObservationSourceRef(observation) {
  return {
    kind: 'observation',
    observationId: observation.id,
    date: observation.date,
    title: observation.title,
    type: observation.type
  }
}

export function createObservationWikiLinkService({ observationService, memoryWikiService }) {
  if (!observationService) {
    throw new Error('observationService is required')
  }
  if (!memoryWikiService) {
    throw new Error('memoryWikiService is required')
  }

  return {
    async linkObservationToPage({ observationId, pageId }) {
      const observation = observationService.get(observationId)
      if (!observation) {
        throw new Error(`observation not found: ${observationId}`)
      }

      return memoryWikiService.addSourceRef(pageId, toObservationSourceRef(observation))
    },

    buildSourceRef(input) {
      return toObservationSourceRef(input)
    },

    normalizeSourceRefKey(sourceRef) {
      return `${normalizeString(sourceRef.kind)}:${normalizeString(sourceRef.observationId)}`
    }
  }
}
