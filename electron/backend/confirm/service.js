import {
  createPendingConfirmation,
  getPendingConfirmation,
  listPendingConfirmationsByDate,
  updatePendingConfirmationStatus
} from '../../db.js'
import { logCategoryAudit } from '../category/audit.js'
import { badRequest, HttpError } from '../http/errors.js'
import {
  buildCategoryRejectFollowupConfirmRequest,
  deriveCategoryRejectResolution
} from './fallback.js'
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
      if (!input?.date) throw badRequest('pending confirmation date is required', undefined, 'date_required')
      if (!input?.conversationMessageId) {
        throw badRequest('pending confirmation conversationMessageId is required', undefined, 'conversation_message_id_required')
      }
      if (!Array.isArray(input?.toolCalls) || input.toolCalls.length === 0) {
        throw badRequest('pending confirmation toolCalls are required', undefined, 'tool_calls_required')
      }
      if (!input?.confirmRequest || typeof input.confirmRequest !== 'object') {
        throw badRequest('pending confirmation confirmRequest is required', undefined, 'confirm_request_required')
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
      if (!id) throw badRequest('pending confirmation id is required', undefined, 'id_required')
      if (!status) throw badRequest('pending confirmation status is required', undefined, 'status_required')
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
      const categoryRejectResolution = deriveCategoryRejectResolution(store, updatedConfirmation)
      const followupConfirmRequest = buildCategoryRejectFollowupConfirmRequest(
        updatedConfirmation,
        categoryRejectResolution
      )

      if (followupConfirmRequest) {
        logCategoryAudit({
          eventType: 'category_mapping_needs_confirmation',
          domain: updatedConfirmation.confirmRequest.domain,
          confirmRequestId: updatedConfirmation.id,
          toolName: followupConfirmRequest.toolName,
          sourceText: updatedConfirmation.sourceText,
          categoryId: followupConfirmRequest.recommendedCategory?.id ?? null,
          categoryName: followupConfirmRequest.recommendedCategory?.name ?? null,
          proposedCategoryName: updatedConfirmation.confirmRequest.proposedCategoryName,
          similarCandidates: Array.isArray(followupConfirmRequest.similarCandidates)
            ? followupConfirmRequest.similarCandidates.map((item) => item.name)
            : [],
          decision: 'confirm',
          reason: followupConfirmRequest.reason
        })
      }

      const rejectionResult = executor.reject(updatedConfirmation, {
        categoryRejectResolution
      })

      let followupConfirmation = null
      if (followupConfirmRequest) {
        followupConfirmation = createPendingConfirmation(store, {
          date: updatedConfirmation.date,
          conversationMessageId: rejectionResult.cornieMessage?.id ?? updatedConfirmation.conversationMessageId,
          status: 'pending',
          sourceText: updatedConfirmation.sourceText,
          assistantReply: rejectionResult.cornieMessage?.content ?? null,
          confirmType: inferConfirmType(followupConfirmRequest),
          toolCalls: updatedConfirmation.toolCalls,
          confirmRequest: followupConfirmRequest
        })
      }

      return {
        confirmation: updatedConfirmation,
        followupConfirmation,
        categoryRejectResolution,
        ...rejectionResult
      }
    }
  }
}
