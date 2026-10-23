<script setup>
import { computed } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
})

function parseInline(text) {
  const segments = []
  const pattern = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match = pattern.exec(text)
  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), strong: false })
    }
    segments.push({ text: match[1], strong: true })
    lastIndex = match.index + match[0].length
    match = pattern.exec(text)
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), strong: false })
  }
  if (segments.length === 0) {
    segments.push({ text, strong: false })
  }
  return segments
}

function parseBlocks(raw) {
  const lines = String(raw ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
  const blocks = []
  let paragraph = []
  let list = null
  let code = null

  function flushParagraph() {
    if (paragraph.length === 0) return
    blocks.push({ type: 'paragraph', inline: parseInline(paragraph.join('\n')) })
    paragraph = []
  }

  function flushList() {
    if (!list) return
    blocks.push({ type: 'list', items: list })
    list = null
  }

  for (const line of lines) {
    if (code !== null) {
      if (/^```/.test(line)) {
        blocks.push({ type: 'code', content: code.join('\n') })
        code = null
      } else {
        code.push(line)
      }
      continue
    }
    if (/^```/.test(line)) {
      flushParagraph()
      flushList()
      code = []
      continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph()
      if (!list) list = []
      list.push(parseInline(line.replace(/^\s*[-*]\s+/, '')))
      continue
    }
    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }
    flushList()
    paragraph.push(line)
  }

  if (code !== null) blocks.push({ type: 'code', content: code.join('\n') })
  flushParagraph()
  flushList()
  return blocks
}

const blocks = computed(() => parseBlocks(props.text))
</script>

<template>
  <div class="msg-body">
    <template v-for="(block, index) in blocks" :key="index">
      <pre v-if="block.type === 'code'" class="msg-body-code">{{ block.content }}</pre>
      <ul v-else-if="block.type === 'list'" class="msg-body-list">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <template v-for="(segment, segmentIndex) in item" :key="segmentIndex">
            <strong v-if="segment.strong">{{ segment.text }}</strong>
            <span v-else>{{ segment.text }}</span>
          </template>
        </li>
      </ul>
      <p v-else class="msg-body-p">
        <template v-for="(segment, segmentIndex) in block.inline" :key="segmentIndex">
          <strong v-if="segment.strong">{{ segment.text }}</strong>
          <span v-else>{{ segment.text }}</span>
        </template>
      </p>
    </template>
  </div>
</template>

<style scoped>
.msg-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.msg-body-p {
  margin: 0;
  white-space: pre-wrap;
}

.msg-body-list {
  margin: 0;
  padding-left: 1.25rem;
  list-style: disc;
}

.msg-body-list li {
  white-space: pre-wrap;
}

.msg-body-code {
  margin: 0;
  padding: 0.5rem 0.65rem;
  border: 2px solid var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-hover);
  font-size: 0.8rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}
</style>
