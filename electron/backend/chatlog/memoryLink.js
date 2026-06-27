function normalizeString(value) {
  return String(value ?? '').trim()
}

function toChatSourceRef(message) {
  return {
    kind: 'chat',
    messageId: message.id,
    date: message.date,
    role: message.role
  }
}

export function createChatlogMemoryLinkService({ chatlogService, memoryWikiService }) {
  if (!chatlogService) {
    throw new Error('chatlogService is required')
  }
  if (!memoryWikiService) {
    throw new Error('memoryWikiService is required')
  }

  return {
    async linkMessageToPage({ date, messageId, pageId }) {
      const record = chatlogService.getByDate(date)
      const message = Array.isArray(record?.messages)
        ? record.messages.find((item) => normalizeString(item.id) === normalizeString(messageId))
        : null

      if (!message) {
        throw new Error(`conversation message not found: ${messageId}`)
      }

      return memoryWikiService.addSourceRef(pageId, toChatSourceRef(message))
    },

    buildSourceRef(input) {
      return toChatSourceRef(input)
    }
  }
}
