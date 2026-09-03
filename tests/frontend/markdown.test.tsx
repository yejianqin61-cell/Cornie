import { describe, expect, it } from 'vitest'
import { parseMarkdown, renderInline } from '../../src/renderer/lib/markdown'

// Markdown 解析器回归（移植自旧 CornieDiaryMarkdown 语义；门禁由 140 间接覆盖）。
// 语法面：标题 1-3 / 引用 / 一级列表 / 段落 / 行内粗斜体 / 空行分块。

describe('parseMarkdown', () => {
  it('空输入 → 无块', () => {
    expect(parseMarkdown('')).toEqual([])
    expect(parseMarkdown('   \n  ')).toEqual([])
    expect(parseMarkdown(null)).toEqual([])
  })

  it('标题分级与行内渲染', () => {
    const blocks = parseMarkdown('# 大标题\n## 中标题\n### 小标题')
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'heading', 'heading'])
    expect(blocks.map((b) => b.level)).toEqual([1, 2, 3])
  })

  it('引用/列表/段落按空行分块', () => {
    const blocks = parseMarkdown('> 引用一行\n> 引用两行\n\n- 甲\n- 乙\n\n普通段落')
    expect(blocks.map((b) => b.type)).toEqual(['quote', 'list', 'paragraph'])
    expect(blocks[0].segments).toHaveLength(3) // 第一行 + <br/> + 第二行
    expect(blocks[1].items).toHaveLength(2)
  })

  it('段落内换行以 <br/> 语义分段渲染', () => {
    const blocks = parseMarkdown('第一行\n第二行')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('paragraph')
    expect(blocks[0].segments).toHaveLength(3)
  })

  it('四级以上标题不是标题（正则只匹配 1-3 个 #）', () => {
    const blocks = parseMarkdown('#### 四级')
    expect(blocks[0].type).toBe('paragraph')
  })
})

describe('renderInline（React 节点，等价旧转义语义）', () => {
  it('粗体与斜体解析', () => {
    const nodes = renderInline('普通 **加粗** 和 *斜体* 结尾')
    expect(nodes).toHaveLength(5)
  })

  it('HTML 字符按纯文本渲染（无注入面）', () => {
    const nodes = renderInline('<script>alert(1)</script>')
    expect(nodes).toHaveLength(1)
  })
})
