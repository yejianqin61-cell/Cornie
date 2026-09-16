<script setup>
import ToolResultPanel from './ToolResultPanel.vue'
import ConfirmCard from './ConfirmCard.vue'

defineProps({
  message: { type: Object, required: true },
  avatarSrc: { type: String, default: '' },
})

defineEmits(['confirmResolved'])

function roleLetter(role) {
  if (role === 'user') return ''
  if (role === 'assistant') return 'C'
  return 'S'
}
</script>

<template>
  <div class="msg-row" :class="'msg-row--' + message.role">
    <div class="msg-row-avatar" :class="'msg-row-avatar--' + message.role">
      <span v-if="!avatarSrc || message.role !== 'user'" class="msg-row-avatar-letter">
        {{ roleLetter(message.role) }}
      </span>
    </div>
    <div class="msg-row-body">
      <div class="msg-row-sender">{{ message.role === 'user' ? '我' : message.role === 'assistant' ? 'Cornie' : '系统' }}</div>
      <div class="msg-row-text">{{ message.text }}</div>
      <ToolResultPanel v-if="message.toolResults?.length" :results="message.toolResults" />
      <ConfirmCard
        v-if="message.confirm"
        :confirm="message.confirm"
        @resolved="$emit('confirmResolved', $event)"
      />
      <div v-if="message.time" class="msg-row-time">{{ message.time }}</div>
    </div>
  </div>
</template>

<style scoped>
.msg-row {
  display: flex;
  gap: 0.6rem;
  padding: 0.6rem 0;
}

.msg-row--user {
  flex-direction: row-reverse;
}

.msg-row-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid #000;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 0.75rem;
  overflow: hidden;
}

.msg-row-avatar-letter {
  font-size: 0.75rem;
  font-weight: 900;
}

.msg-row-avatar--user {
  background: #FFD100;
}

.msg-row-avatar--assistant {
  background: #FFD100;
  border-color: #000;
}

.msg-row-avatar--system {
  background: #ddd;
}

.msg-row-body {
  max-width: 75%;
  display: flex;
  flex-direction: column;
}

.msg-row--user .msg-row-body {
  align-items: flex-end;
}

.msg-row-sender {
  font-size: 0.7rem;
  font-weight: 700;
  margin-bottom: 0.15rem;
  color: var(--nb-text-secondary);
}

.msg-row-text {
  font-size: 0.85rem;
  line-height: 1.5;
  padding: 0.5rem 0.75rem;
  border: 2px solid #000;
  border-radius: 0.75rem;
  word-break: break-word;
}

.msg-row--user .msg-row-text {
  background: #FFD100;
  border-bottom-right-radius: 0.25rem;
}

.msg-row--assistant .msg-row-text,
.msg-row--system .msg-row-text {
  background: #fff;
  border-bottom-left-radius: 0.25rem;
}

.msg-row-time {
  font-size: 0.65rem;
  color: var(--nb-text-secondary);
  margin-top: 0.15rem;
}
</style>