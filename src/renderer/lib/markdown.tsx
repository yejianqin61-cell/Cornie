import { type ReactNode } from 'react'

// 极简 Markdown 渲染（从 Vue 版 CornieDiaryMarkdown.vue 原样移植为 TS 解析器）。
// 语法面保持一致：标题 1-3 / 引用 / 一级列表 / 段落 / 行内粗斜体；Vue 版「先转义后替换」
// 的防 XSS 语义由「纯 React 节点渲染」等价达成（不产生任何 HTML 字符串注入面）。
// headingLevel=0 时标题全部降级为 div（用于摘要/按钮内等非文档场景）。

export interface MarkdownBlock {
  type: 'heading' | 'quote' | 'list' | 'paragraph'
  level?: number
  segments: ReactNode[]
  items?: ReactNode[][]
}

let inlineKeySeq = 0

/** 行内渲染：**bold** / *italic*；其余文本按字面保留（纯文本渲染天然转义）。 */
export function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*(?:[^*]+?)\*\*|\*(?:[^*]+?)\*)/g)
  const nodes: ReactNode[] = []
  for (const token of tokens) {
    if (!token) continue
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      inlineKeySeq += 1
      nodes.push(
        <strong key={`b-${inlineKeySeq}`} style={{ fontWeight: 800 }}>
          {token.slice(2, -2)}
        </strong>
      )
      continue
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      inlineKeySeq += 1
      nodes.push(<em key={`i-${inlineKeySeq}`}>{token.slice(1, -1)}</em>)
      continue
    }
    inlineKeySeq += 1
    nodes.push(<span key={`t-${inlineKeySeq}`}>{token}</span>)
  }
  return nodes
}

/** 解析 markdown 文本为块列表（与 Vue 版 parseMarkdown 逐条对应）。 */
export function parseMarkdown(content: unknown): MarkdownBlock[] {
  const normalized = String(content ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
  if (!normalized) return []

  const lines = normalized.split('\n')
  const blocks: MarkdownBlock[] = []
  const paragraphLines: string[] = []
  const listItems: string[] = []
  const quoteLines: string[] = []

  function flushParagraph() {
    if (paragraphLines.length === 0) return
    blocks.push({
      type: 'paragraph',
      segments: paragraphLines.flatMap((line, index) => {
        const rendered = renderInline(line)
        return index === 0 ? rendered : [<br key={`br-${index}`} />, ...rendered]
      }),
    })
    paragraphLines.length = 0
  }

  function flushList() {
    if (listItems.length === 0) return
    blocks.push({ type: 'list', segments: [], items: listItems.map((item) => renderInline(item)) })
    listItems.length = 0
  }

  function flushQuote() {
    if (quoteLines.length === 0) return
    blocks.push({
      type: 'quote',
      segments: quoteLines.flatMap((line, index) => {
        const rendered = renderInline(line)
        return index === 0 ? rendered : [<br key={`qbr-${index}`} />, ...rendered]
      }),
    })
    quoteLines.length = 0
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      flushList()
      flushQuote()
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      flushQuote()
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        segments: renderInline(headingMatch[2]),
      })
      continue
    }

    const quoteMatch = line.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      flushParagraph()
      flushList()
      quoteLines.push(quoteMatch[1])
      continue
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/)
    if (listMatch) {
      flushParagraph()
      flushQuote()
      listItems.push(listMatch[1])
      continue
    }

    flushList()
    flushQuote()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()
  flushQuote()

  return blocks
}
