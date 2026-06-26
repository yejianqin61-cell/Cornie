import {
  createPendingConfirmation,
  getPendingConfirmation,
  listPendingConfirmationsByDate,
  updatePendingConfirmationStatus
} from '../../db.js'

function inferConfirmType(confirmRequest) {
  if (typeof confirmRequest?.kind === 'string' && confirmRequest.kind.trim()) {
    return confirmRequest.kind
  }
  if (typeof confirmRequest?.toolName === 'string' && confirmRequest.toolName.trim()) {
    return confirmRequest.toolName
  }
  return 'tool_confirmation'
}

export function createConfirmService(store) {
  return {
    createPending(input) {
      if (!input?.date) throw new Error('pending confirmation date is required')
      if (!input?.conversationMessageId) {
        throw new Error('pending confirmation conversationMessageId is required')
      }
      if (!Array.isArray(input?.toolCalls) || input.toolCalls.length === 0) {
        throw new Error('pending confirmation toolCalls are required')
      }
      if (!input?.confirmRequest || typeof input.confirmRequest !== 'object') {
        throw new Error('pending confirmation confirmRequest is required')
      }

      return createPendingConfirmation(store, {
        date: input.date,
        conversationMessageId: input.conversationMessageId,
        status: input.status ?? 'pending',
        sourceText: input.sourceText ?? null,
        assistantReply: input.assistantReply ?? null,
        confirmType: input.confirmType ?? inferConfirmType(input.confirmRequest),
        toolCalls: input.toolCalls,
        confirmRequest: input.confirmRequest
      })
    },

    get(id) {
      return getPendingConfirmation(store, id)
    },

    listByDate({ date, status } = {}) {
      return listPendingConfirmationsByDate(store, { date, status })
    },

    markStatus({ id, status, resolvedAt }) {
      if (!id) throw new Error('pending confirmation id is required')
      if (!status) throw new Error('pending confirmation status is required')
      return updatePendingConfirmationStatus(store, { id, status, resolvedAt })
    }
  }
}
