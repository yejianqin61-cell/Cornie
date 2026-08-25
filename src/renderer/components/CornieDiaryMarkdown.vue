<script setup>
import { computed } from 'vue'

const props = defineProps({
  content: {
    type: String,
    default: '',
  },
  // 允许渲染的最大标题级别（1-3）。设为 0 时标题全部降级为 div（用于摘要/按钮内等非文档场景，避免 button 内嵌套 h1-h3）。
  headingLevel: {
    type: Number,
    default: 3,
  },
})

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderInline(text) {
  const escaped = escapeHtml(text)
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
}

function flushParagraph(paragraphLines, blocks) {
  if (paragraphLines.length === 0) return
  blocks.push({
    type: 'paragraph',
    html: paragraphLines.map((line) => renderInline(line)).join('<br />'),
  })
  paragraphLines.length = 0
}

function flushList(listItems, blocks) {
  if (listItems.length === 0) return
  blocks.push({
    type: 'list',
    items: listItems.map((item) => renderInline(item)),
  })
  listItems.length = 0
}

function flushQuote(quoteLines, blocks) {
  if (quoteLines.length === 0) return
  blocks.push({
    type: 'quote',
    html: quoteLines.map((line) => renderInline(line)).join('<br />'),
  })
  quoteLines.length = 0
}

function parseMarkdown(content) {
  const normalized = String(content ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
  if (!normalized) return []

  const lines = normalized.split('\n')
  const blocks = []
  const paragraphLines = []
  const listItems = []
  const quoteLines = []

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph(paragraphLines, blocks)
      flushList(listItems, blocks)
      flushQuote(quoteLines, blocks)
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph(paragraphLines, blocks)
      flushList(listItems, blocks)
      flushQuote(quoteLines, blocks)
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        html: renderInline(headingMatch[2]),
      })
      continue
    }

    const quoteMatch = line.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      flushParagraph(paragraphLines, blocks)
      flushList(listItems, blocks)
      quoteLines.push(quoteMatch[1])
      continue
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/)
    if (listMatch) {
      flushParagraph(paragraphLines, blocks)
      flushQuote(quoteLines, blocks)
      listItems.push(listMatch[1])
      continue
    }

    flushList(listItems, blocks)
    flushQuote(quoteLines, blocks)
    paragraphLines.push(line)
  }

  flushParagraph(paragraphLines, blocks)
  flushList(listItems, blocks)
  flushQuote(quoteLines, blocks)

  return blocks
}

const blocks = computed(() => parseMarkdown(props.content))
</script>

<template>
  <div class="cornieMarkdown">
    <template v-for="(block, index) in blocks" :key="`${block.type}-${index}`">
      <template v-if="block.type === 'heading'">
        <h1 v-if="block.level === 1 && headingLevel >= 1" class="mdH1" v-html="block.html"></h1>
        <h2 v-else-if="block.level === 2 && headingLevel >= 2" class="mdH2" v-html="block.html"></h2>
        <h3 v-else-if="block.level === 3 && headingLevel >= 3" class="mdH3" v-html="block.html"></h3>
        <div v-else class="mdHeadingFlat" v-html="block.html"></div>
      </template>
      <blockquote v-else-if="block.type === 'quote'" class="mdQuote" v-html="block.html"></blockquote>
      <ul v-else-if="block.type === 'list'" class="mdList">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex" v-html="item"></li>
      </ul>
      <p v-else class="mdParagraph" v-html="block.html"></p>
    </template>
  </div>
</template>

<style scoped>
.cornieMarkdown {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: inherit;
}

.mdH1,
.mdH2,
.mdH3 {
  margin: 0;
  font-weight: 800;
  color: inherit;
  line-height: 1.35;
}

.mdH1 {
  font-size: 1.14rem;
}
.mdH2 {
  font-size: 1.02rem;
}
.mdH3 {
  font-size: 0.96rem;
}

.mdParagraph {
  margin: 0;
  line-height: 1.8;
}

.mdParagraph :deep(br),
.mdQuote :deep(br) {
  content: '';
}

.mdQuote {
  margin: 0;
  padding: 10px 12px;
  border-left: 3px solid rgba(155, 107, 122, 0.28);
  background: rgba(255, 255, 255, 0.42);
  border-radius: 0 12px 12px 0;
  line-height: 1.8;
  color: inherit;
}

.mdList {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  line-height: 1.75;
}

:deep(strong) {
  font-weight: 800;
}

:deep(em) {
  font-style: italic;
}
</style>
