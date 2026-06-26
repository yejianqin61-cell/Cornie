import {
  createPendingConfirmation,
  getPendingConfirmation,
  listPendingConfirmationsByDate,
  updatePendingConfirmationStatus
} from '../../db.js'
import { logCategoryAudit } from '../category/audit.js'
import { badRequest, HttpError } from '../http/errors.js'
import { createConfirmExecutor } from './executor.js'

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
  const executor = createConfirmExecutor(store)

  function requireExisting(id) {
    const confirmation = getPendingConfirmation(store, id)
    if (!confirmation) {
      throw new HttpError(404, 'confirmation not found')
    }
    return confirmation
  }

  function ensurePending(confirmation) {
    if (confirmation.status !== 'pending') {
      throw new HttpError(409, `confirmation is already ${confirmation.status}`)
    }
  }

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
    },

    approve(id) {
      if (!id) throw badRequest('confirmation id is required')
      const confirmation = requireExisting(id)
      ensurePending(confirmation)
      return updatePendingConfirmationStatus(store, {
        id,
        status: 'approved',
        resolvedAt: Date.now()
      })
    },

    reject(id) {
      if (!id) throw badRequest('confirmation id is required')
      const confirmation = requireExisting(id)
      ensurePending(confirmation)
      return updatePendingConfirmationStatus(store, {
        id,
        status: 'rejected',
        resolvedAt: Date.now()
      })
    },

    async executeApprovedConfirmation(id) {
      if (!id) throw badRequest('confirmation id is required')
      const confirmation = requireExisting(id)
      if (confirmation.status !== 'approved') {
        throw new HttpError(409, `confirmation is not approved: ${confirmation.status}`)
      }

      try {
        const executionResult = await executor.execute(confirmation)
        const updatedConfirmation = updatePendingConfirmationStatus(store, {
          id,
          status: 'executed',
          resolvedAt: Date.now()
        })
        return {
          confirmation: updatedConfirmation,
          ...executionResult
        }
      } catch (error) {
        updatePendingConfirmationStatus(store, {
          id,
          status: 'failed',
          resolvedAt: Date.now()
        })
        throw error
      }
    },

    rejectConfirmation(id) {
      if (!id) throw badRequest('confirmation id is required')
      const confirmation = requireExisting(id)
      ensurePending(confirmation)
      const updatedConfirmation = updatePendingConfirmationStatus(store, {
        id,
        status: 'rejected',
        resolvedAt: Date.now()
      })
      if (updatedConfirmation.confirmRequest?.kind === 'category_creation_confirmation') {
        logCategoryAudit({
          eventType: 'category_creation_rejected',
          domain: updatedConfirmation.confirmRequest.domain,
          confirmRequestId: updatedConfirmation.id,
          toolName: updatedConfirmation.confirmRequest.toolName,
          sourceText: updatedConfirmation.sourceText,
          proposedCategoryName: updatedConfirmation.confirmRequest.proposedCategoryName,
          decision: 'rejected',
          reason: updatedConfirmation.confirmRequest.reason
        })
      }
      const rejectionResult = executor.reject(updatedConfirmation)
      return {
        confirmation: updatedConfirmation,
        ...rejectionResult
      }
    }
  }
}
