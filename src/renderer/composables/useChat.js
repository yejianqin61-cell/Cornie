import { nextTick, ref } from 'vue'
import {
  getConversation,
  listConfirmations,
  sendMessage,
  submitConfirmationDecision
} from '../api'

export function useChat() {
  const messages = ref([])
  const sending = ref(false)

  function today() {
    return new Date().toISOString().slice(0, 10)
  }

  function pushChatItem(item) {
    messages.value.push({
      id: item.id || `${item.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...item
    })
  }

  function setConfirmMessageState(id, patch) {
    const target = messages.value.find((item) => item.id === id)
    if (!target) return
    Object.assign(target, patch)
  }

  function appendResponse(data) {
    if (data?.cornieMessage?.content) {
      pushChatItem({
        kind: 'message',
        role: 'cornie',
        content: data.cornieMessage.content,
        id: data.cornieMessage.id
      })
    }

    if (data?.toolExecution?.used && Array.isArray(data.toolExecution.results) && data.toolExecution.results.length > 0) {
      pushChatItem({
        kind: 'tool_result',
        results: data.toolExecution.results
      })
    }

    const decision = data?.policyDecision?.decision
    if (decision === 'confirm') {
      pushChatItem({
        kind: 'confirm',
        request: data.policyDecision.confirmRequest || {},
        pendingConfirmationId: data?.pendingConfirmation?.id || '',
        status: data?.pendingConfirmation?.status || 'pending',
        errorMessage: ''
      })
    } else if (decision === 'ask_back') {
      pushChatItem({
        kind: 'ask_back',
        question: data.policyDecision.question || '',
        reason: data.policyDecision.reason || ''
      })
    } else if (decision === 'deny') {
      pushChatItem({
        kind: 'error',
        content: data.policyDecision.reason || '这个动作现在不能执行。'
      })
    }
  }

  async function send(text) {
    if (!text || sending.value) return
    sending.value = true

    pushChatItem({ kind: 'message', role: 'user', content: text, id: Date.now().toString() })

    try {
      const data = await sendMessage(text, today())
      appendResponse(data)
      return data
    } catch {
      pushChatItem({
        kind: 'message',
        role: 'cornie',
        content: '唔...我好像走神了，能再说一遍吗？',
        id: 'err-' + Date.now(),
        error: true
      })
      return null
    } finally {
      sending.value = false
    }
  }

  async function handleConfirmAction(action, item) {
    if (!item?.pendingConfirmationId || item.status !== 'pending') return

    setConfirmMessageState(item.id, { status: 'processing', errorMessage: '' })

    try {
      const result = await submitConfirmationDecision(
        item.pendingConfirmationId,
        action === 'confirm' ? 'approve' : 'reject'
      )

      setConfirmMessageState(item.id, {
        status: result?.confirmation?.status || (action === 'confirm' ? 'approved' : 'rejected'),
        errorMessage: ''
      })

      if (result?.toolExecution?.used && Array.isArray(result.toolExecution.results) && result.toolExecution.results.length > 0) {
        pushChatItem({ kind: 'tool_result', results: result.toolExecution.results })
      }

      if (result?.cornieMessage?.content) {
        pushChatItem({
          kind: 'message',
          role: 'cornie',
          content: result.cornieMessage.content,
          id: result.cornieMessage.id
        })
      }

      if (result?.followupConfirmation?.id && result?.followupConfirmation?.confirmRequest) {
        pushChatItem({
          kind: 'confirm',
          request: result.followupConfirmation.confirmRequest,
          pendingConfirmationId: result.followupConfirmation.id,
          status: result.followupConfirmation.status || 'pending',
          errorMessage: ''
        })
      }
    } catch (error) {
      setConfirmMessageState(item.id, {
        status: 'failed',
        errorMessage: error?.message || '确认处理失败，请稍后再试。'
      })
    }
  }

  async function restorePendingConfirmations(date) {
    try {
      const data = await listConfirmations({ date: date || today(), status: 'pending' })
      for (const confirmation of data?.confirmations || []) {
        const exists = messages.value.some(
          (item) => item.kind === 'confirm' && item.pendingConfirmationId === confirmation.id
        )
        if (!exists) {
          pushChatItem({
            kind: 'confirm',
            request: confirmation.confirmRequest || {},
            pendingConfirmationId: confirmation.id,
            status: confirmation.status || 'pending',
            errorMessage: ''
          })
        }
      }
    } catch {
      // ignore restore failure
    }
  }

  async function loadConversation(date) {
    try {
      const data = await getConversation(date)
      if (Array.isArray(data?.messages)) {
        for (const msg of data.messages) {
          const exists = messages.value.some((m) => m.id === msg.id)
          if (!exists) {
            pushChatItem({
              kind: 'message',
              role: msg.role === 'user' ? 'user' : 'cornie',
              content: msg.content,
              id: msg.id
            })
          }
        }
      }
    } catch {
      // ignore load failure
    }
  }

  async function scrollChatToBottom(chatListRef) {
    await nextTick()
    if (chatListRef?.value) {
      chatListRef.value.scrollTop = chatListRef.value.scrollHeight
    }
  }

  return {
    messages,
    sending,
    send,
    pushChatItem,
    appendResponse,
    setConfirmMessageState,
    handleConfirmAction,
    restorePendingConfirmations,
    loadConversation,
    scrollChatToBottom
  }
}
