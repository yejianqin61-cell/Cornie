function normalizeString(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return normalizeString(value).toLowerCase()
}

function toChatRef(message) {
  return `${normalizeString(message.date)}#${normalizeString(message.id)}`
}

export function createChatlogTopicLinkService({ chatlogService, topicIndex }) {
  if (!chatlogService) {
    throw new Error('chatlogService is required')
  }
  if (!topicIndex) {
    throw new Error('topicIndex is required')
  }

  return {
    async linkMessageToTopic({ date, messageId, keyword, aliases, importance, note, pageId }) {
      const normalizedKeyword = normalizeKey(keyword)
      if (!normalizedKeyword) {
        throw new Error('keyword is required')
      }

      const record = chatlogService.getByDate(date)
      const message = Array.isArray(record?.messages)
        ? record.messages.find((item) => normalizeString(item.id) === normalizeString(messageId))
        : null

      if (!message) {
        throw new Error(`conversation message not found: ${messageId}`)
      }

      const existing = await topicIndex.get(normalizedKeyword)
      const mergedAliases = Array.from(
        new Set([...(existing?.aliases ?? []), ...(Array.isArray(aliases) ? aliases : [])].map((item) => normalizeString(item)).filter(Boolean))
      )

      await topicIndex.upsert({
        ...(existing ?? {}),
        keyword: existing?.keyword || normalizeString(keyword),
        normalizedKey: normalizedKeyword,
        aliases: mergedAliases,
        importance: importance ?? existing?.importance ?? 'medium',
        note: note ?? existing?.note ?? ''
      })

      await topicIndex.addDateRef(normalizedKeyword, message.date)
      await topicIndex.addChatRef(normalizedKeyword, toChatRef(message))

      if (pageId) {
        await topicIndex.linkPage(normalizedKeyword, pageId)
      }

      return topicIndex.get(normalizedKeyword)
    },

    buildChatRef(input) {
      return toChatRef(input)
    }
  }
}
