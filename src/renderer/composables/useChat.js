import { nextTick, ref } from 'vue'
import { getConversation, listConfirmations, sendMessage, streamConversation, submitConfirmationDecision } from '../api'
import { collectChangedDomains, emitDataChanged } from '../syncSignals'
import { today } from '../utils/date'

export function useChat() {
  const messages = ref([])
  const sending = ref(false)
  let syncTimer = null
  let visibilityHandler = null

  function pushChatItem(item) {
    messages.value.push({
      id: item.id || `${item.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...item,
    })
  }

  function replaceMessageById(id, patch) {
    const existing = messages.value.find((item) => item.id === id)
    if (!existing) return false
    const merged = { ...existing, ...patch }
    // R-02：upsert 语义——先移除所有同 id 旧项再追加合并项，杜绝同 id 并存（轮询与流式占位替换竞态）。
    messages.value = [...messages.value.filter((item) => item.id !== id), merged]
    return true
  }

  function hasEquivalentMessage(msg) {
    return messages.value.some((item) => {
      if (item.kind !== 'message') return false
      if (item.id === msg.id) return true
      // R-02：cornie 消息按 role+content 去重（放宽，不再要求 pendingSync）。
      // 覆盖"轮询拉到 DB 正式消息 vs 本地已上屏（含流式占位累积到同内容）"的竞态重复。
      if (item.role === 'cornie' && msg.role === 'cornie') {
        return item.content === msg.content
      }
      return (
        item.role === (msg.role === 'user' ? 'user' : 'cornie') &&
        item.content === msg.content &&
        item.pendingSync === true
      )
    })
  }

  function setConfirmMessageState(id, patch) {
    const target = messages.value.find((item) => item.id === id)
    if (!target) return
    Object.assign(target, patch)
  }

  function notifyDataChanged(results, source) {
    const changed = collectChangedDomains(results || [])
    if (!Object.values(changed).some(Boolean)) return
    emitDataChanged({ source, ...changed })
  }

  function appendResponse(data, { replaceId = null } = {}) {
    // 453：钻取轮的联想话语（层间短话）先上屏，最终回复随后接续。
    if (Array.isArray(data?.interimReplies)) {
      for (const line of data.interimReplies) {
        if (typeof line === 'string' && line.trim()) {
          pushChatItem({
            kind: 'message',
            role: 'cornie',
            content: line,
            interim: true,
          })
        }
      }
    }

    // FE-03：流式路径（replaceId）将最终回复替换进 streaming 占位消息，不重复上屏。
    if (replaceId) {
      if (data?.cornieMessage?.content) {
        replaceMessageById(replaceId, {
          id: data.cornieMessage.id,
          content: data.cornieMessage.content,
          streaming: false,
          pendingSync: false,
        })
      } else {
        replaceMessageById(replaceId, { streaming: false, error: true })
      }
    } else if (data?.cornieMessage?.content) {
      pushChatItem({
        kind: 'message',
        role: 'cornie',
        content: data.cornieMessage.content,
        id: data.cornieMessage.id,
      })
    }

    if (
      data?.toolExecution?.used &&
      Array.isArray(data.toolExecution.results) &&
      data.toolExecution.results.length > 0
    ) {
      pushChatItem({
        kind: 'tool_result',
        results: data.toolExecution.results,
      })
    }

    const decision = data?.policyDecision?.decision
    if (decision === 'confirm') {
      pushChatItem({
        kind: 'confirm',
        request: data.policyDecision.confirmRequest || {},
        pendingConfirmationId: data?.pendingConfirmation?.id || '',
        status: data?.pendingConfirmation?.status || 'pending',
        errorMessage: '',
      })
    } else if (decision === 'ask_back') {
      pushChatItem({
        kind: 'ask_back',
        question: data.policyDecision.question || '',
        reason: data.policyDecision.reason || '',
      })
    } else if (decision === 'deny') {
      pushChatItem({
        kind: 'error',
        content: data.policyDecision.reason || '这个动作现在不能执行。',
      })
    }

    notifyDataChanged(data?.toolExecution?.results, 'chat')
  }

  // FE-03：统一发送骨架——stream=false 走 sendMessage，stream=true 走 streamConversation + 逐字增量。
  // 占位消息、发送中禁发、用户消息 id 回填、层间话语/工具结果/确认卡、错误回退全部共用；
  // 差异仅在于"最终回复是否以 streaming 占位逐字渲染（stream=true）"。
  async function sendCore(text, { stream = false } = {}) {
    if (!text || sending.value) return null
    sending.value = true

    const tempId = `temp-user-${Date.now()}`
    const liveId = stream ? `live-cornie-${Date.now()}` : null

    pushChatItem({
      kind: 'message',
      role: 'user',
      content: text,
      id: tempId,
      pendingSync: true,
    })

    if (liveId) {
      pushChatItem({
        kind: 'message',
        role: 'cornie',
        content: '',
        id: liveId,
        streaming: true,
      })
    }

    try {
      let data
      if (stream) {
        const appendDelta = (delta) => {
          const target = messages.value.find((item) => item.id === liveId)
          if (target) {
            target.content += delta
          }
        }
        data = await streamConversation({ message: text, date: today() }, appendDelta)
      } else {
        data = await sendMessage(text, today())
      }

      if (data?.userMessage?.id) {
        replaceMessageById(tempId, {
          id: data.userMessage.id,
          pendingSync: false,
        })
      }

      appendResponse(data, liveId ? { replaceId: liveId } : {})
      return data
    } catch {
      replaceMessageById(tempId, { pendingSync: false, error: true })
      if (liveId) {
        replaceMessageById(liveId, {
          content: '唔...我好像走神了，能再说一遍吗？',
          streaming: false,
          error: true,
        })
      } else {
        pushChatItem({
          kind: 'message',
          role: 'cornie',
          content: '唔...我好像走神了，能再说一遍吗？',
          id: 'err-' + Date.now(),
          error: true,
        })
      }
      return null
    } finally {
      sending.value = false
    }
  }

  function send(text) {
    return sendCore(text)
  }

  // 454：流式发送——最终回复逐字渲染；tool_call 信封不流式（由服务端保证）。
  function streamSend(text) {
    return sendCore(text, { stream: true })
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
        errorMessage: '',
      })

      if (
        result?.toolExecution?.used &&
        Array.isArray(result.toolExecution.results) &&
        result.toolExecution.results.length > 0
      ) {
        pushChatItem({ kind: 'tool_result', results: result.toolExecution.results })
      }

      if (result?.cornieMessage?.content) {
        pushChatItem({
          kind: 'message',
          role: 'cornie',
          content: result.cornieMessage.content,
          id: result.cornieMessage.id,
        })
      }

      if (result?.followupConfirmation?.id && result?.followupConfirmation?.confirmRequest) {
        pushChatItem({
          kind: 'confirm',
          request: result.followupConfirmation.confirmRequest,
          pendingConfirmationId: result.followupConfirmation.id,
          status: result.followupConfirmation.status || 'pending',
          errorMessage: '',
        })
      }

      notifyDataChanged(result?.toolExecution?.results, 'confirmation')
    } catch (error) {
      setConfirmMessageState(item.id, {
        status: 'failed',
        errorMessage: error?.message || '确认处理失败，请稍后再试。',
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
            errorMessage: '',
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
          const exists = hasEquivalentMessage(msg)
          if (!exists) {
            pushChatItem({
              kind: 'message',
              role: msg.role === 'user' ? 'user' : 'cornie',
              content: msg.content,
              id: msg.id,
            })
          }
        }
      }
    } catch {
      // ignore load failure
    }
  }

  async function syncConversation(date) {
    await loadConversation(date)
    await restorePendingConfirmations(date)
  }

  function startConversationSync(date, options = {}) {
    const syncDate = date || today()
    const intervalMs = Math.max(1000, Number(options.intervalMs) || 3000)
    const onAfterSync = typeof options.onAfterSync === 'function' ? options.onAfterSync : null

    stopConversationSync()

    // FE-04：防重入——上一次同步未完成时跳过本轮，避免慢响应下请求叠加。
    let syncing = false
    const runSync = async () => {
      if (syncing) return
      syncing = true
      try {
        if (typeof document !== 'undefined' && document.hidden) return
        await syncConversation(syncDate)
        await onAfterSync?.()
      } finally {
        syncing = false
      }
    }

    // FE-04：窗口隐藏时定时器仍走（runSync 内部跳过），恢复可见立即补一次同步。
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        runSync()
      }
    }
    visibilityHandler = onVisibilityChange
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }

    syncTimer = window.setInterval(() => {
      runSync()
    }, intervalMs)

    runSync()
  }

  function stopConversationSync() {
    if (syncTimer) {
      window.clearInterval(syncTimer)
      syncTimer = null
    }
    if (typeof document !== 'undefined' && visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
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
    streamSend,
    pushChatItem,
    replaceMessageById,
    appendResponse,
    setConfirmMessageState,
    handleConfirmAction,
    restorePendingConfirmations,
    loadConversation,
    syncConversation,
    startConversationSync,
    stopConversationSync,
    scrollChatToBottom,
  }
}
