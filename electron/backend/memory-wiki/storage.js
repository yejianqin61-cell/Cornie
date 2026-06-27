import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  resolveMemoryWikiIndexRoot,
  resolveMemoryWikiPagesRoot,
  resolveMemoryWikiRoot
} from './constants.js'
import { createPageModel } from './pageModel.js'

const FRONTMATTER_BOUNDARY = '---'
const PAGE_INDEX_FILENAME = 'page-index.json'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function toScalarValue(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value == null) return ''
  return String(value)
}

function serializeArrayItem(value) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value == null) return ''
  return JSON.stringify(value)
}

function parseScalarValue(value) {
  const normalized = normalizeString(value)
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return normalized
}

function parseArrayItem(value) {
  const normalized = normalizeString(value)
  if (!normalized) return ''
  if ((normalized.startsWith('{') && normalized.endsWith('}')) || (normalized.startsWith('[') && normalized.endsWith(']'))) {
    try {
      return JSON.parse(normalized)
    } catch {
      return normalized
    }
  }
  return parseScalarValue(normalized)
}

function sanitizeFileSegment(value) {
  const normalized = normalizeString(value)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\.+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || 'untitled'
}

function serializeMetadata(page) {
  const metadata = {
    page_id: page.pageId,
    page_type: page.pageType,
    title: page.title,
    slug: page.slug,
    aliases: Array.isArray(page.aliases) ? page.aliases : [],
    related_page_ids: Array.isArray(page.relatedPageIds) ? page.relatedPageIds : [],
    summary: page.summary ?? '',
    status: page.status,
    confidence: page.confidence,
    source_refs: Array.isArray(page.sourceRefs) ? page.sourceRefs : [],
    first_noted_at: page.firstNotedAt,
    last_updated_at: page.lastUpdatedAt,
    last_mentioned_at: page.lastMentionedAt ?? '',
    importance: page.importance,
    owner_confirmed: page.ownerConfirmed === true
  }

  const lines = [FRONTMATTER_BOUNDARY]
  for (const [key, rawValue] of Object.entries(metadata)) {
    if (Array.isArray(rawValue)) {
      lines.push(`${key}:`)
      for (const item of rawValue) {
        lines.push(`  - ${serializeArrayItem(item)}`)
      }
      continue
    }
    lines.push(`${key}: ${toScalarValue(rawValue)}`)
  }
  lines.push(FRONTMATTER_BOUNDARY, '')
  return lines.join('\n')
}

function serializePage(pageInput) {
  const page = createPageModel(pageInput)
  const body = String(page.body ?? '')
  return `${serializeMetadata(page)}${body}${body.endsWith('\n') ? '' : '\n'}`
}

function parseFrontmatter(text) {
  const normalized = String(text ?? '').replace(/\r\n/g, '\n')
  if (!normalized.startsWith(`${FRONTMATTER_BOUNDARY}\n`)) {
    throw new Error('memory wiki page is missing frontmatter boundary')
  }

  const closingBoundaryIndex = normalized.indexOf(`\n${FRONTMATTER_BOUNDARY}\n`, FRONTMATTER_BOUNDARY.length + 1)
  if (closingBoundaryIndex === -1) {
    throw new Error('memory wiki page frontmatter is not closed')
  }

  const frontmatterText = normalized.slice(FRONTMATTER_BOUNDARY.length + 1, closingBoundaryIndex)
  const body = normalized.slice(closingBoundaryIndex + `\n${FRONTMATTER_BOUNDARY}\n`.length)

  const metadata = {}
  let activeArrayKey = null

  for (const line of frontmatterText.split('\n')) {
    if (!line.trim()) continue

    const arrayMatch = line.match(/^([a-z0-9_]+):\s*$/i)
    if (arrayMatch) {
      activeArrayKey = arrayMatch[1]
      metadata[activeArrayKey] = []
      continue
    }

    const arrayItemMatch = line.match(/^\s*-\s+(.*)$/)
    if (arrayItemMatch && activeArrayKey) {
      metadata[activeArrayKey].push(parseArrayItem(arrayItemMatch[1]))
      continue
    }

    activeArrayKey = null
    const scalarMatch = line.match(/^([a-z0-9_]+):\s*(.*)$/i)
    if (!scalarMatch) {
      throw new Error(`invalid memory wiki frontmatter line: ${line}`)
    }
    metadata[scalarMatch[1]] = parseScalarValue(scalarMatch[2])
  }

  return { metadata, body }
}

function toPageInput(parsed, filePath) {
  return {
    page_id: parsed.metadata.page_id,
    page_type: parsed.metadata.page_type,
    title: parsed.metadata.title,
    slug: parsed.metadata.slug,
    aliases: parsed.metadata.aliases,
    related_page_ids: parsed.metadata.related_page_ids,
    summary: parsed.metadata.summary,
    status: parsed.metadata.status,
    confidence: parsed.metadata.confidence,
    source_refs: parsed.metadata.source_refs,
    first_noted_at: parsed.metadata.first_noted_at,
    last_updated_at: parsed.metadata.last_updated_at,
    last_mentioned_at: parsed.metadata.last_mentioned_at,
    importance: parsed.metadata.importance,
    owner_confirmed: parsed.metadata.owner_confirmed,
    body: parsed.body.trimEnd(),
    filePath
  }
}

async function ensureBaseDirectories(baseDir) {
  await fs.mkdir(resolveMemoryWikiRoot(baseDir), { recursive: true })
  await fs.mkdir(resolveMemoryWikiPagesRoot(baseDir), { recursive: true })
  await fs.mkdir(resolveMemoryWikiIndexRoot(baseDir), { recursive: true })
}

async function ensureJsonFile(filePath, fallbackValue) {
  try {
    await fs.access(filePath)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    await fs.writeFile(filePath, JSON.stringify(fallbackValue, null, 2), 'utf8')
  }
}

function buildPageFilePath(baseDir, page) {
  const safeFilename = sanitizeFileSegment(page.filename)
  return path.join(resolveMemoryWikiPagesRoot(baseDir), page.directoryName, safeFilename)
}

function assertPathWithinRoot(rootPath, targetPath) {
  const resolvedRoot = path.resolve(rootPath)
  const resolvedTarget = path.resolve(targetPath)
  const relative = path.relative(resolvedRoot, resolvedTarget)
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return resolvedTarget
  }
  throw new Error(`memory wiki path escapes root: ${targetPath}`)
}

async function ensureFileDoesNotExist(filePath) {
  try {
    await fs.access(filePath)
    throw new Error(`memory wiki page already exists: ${filePath}`)
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
}

async function writePageFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tempFilePath = `${filePath}.${randomUUID()}.tmp`
  await fs.writeFile(tempFilePath, content, 'utf8')
  await fs.rename(tempFilePath, filePath)
}

export async function createMemoryWikiStorage(baseDir) {
  await ensureBaseDirectories(baseDir)
  const pagesRoot = resolveMemoryWikiPagesRoot(baseDir)
  const indexRoot = resolveMemoryWikiIndexRoot(baseDir)
  const pageIndexPath = path.join(indexRoot, PAGE_INDEX_FILENAME)
  await ensureJsonFile(pageIndexPath, {})

  async function readPageIndex() {
    const text = await fs.readFile(pageIndexPath, 'utf8')
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : {}
  }

  async function writePageIndex(indexMap) {
    await fs.writeFile(pageIndexPath, JSON.stringify(indexMap, null, 2), 'utf8')
  }

  async function upsertPageIndexEntry(page) {
    const indexMap = await readPageIndex()
    indexMap[page.pageId] = {
      pageId: page.pageId,
      pageType: page.pageType,
      title: page.title,
      slug: page.slug,
      status: page.status,
      importance: page.importance,
      filePath: page.filePath,
      updatedAt: page.lastUpdatedAt
    }
    await writePageIndex(indexMap)
  }

  async function deletePageIndexEntry(pageId) {
    const indexMap = await readPageIndex()
    delete indexMap[pageId]
    await writePageIndex(indexMap)
  }

  async function getIndexedFilePath(pageId) {
    const indexMap = await readPageIndex()
    const record = indexMap[pageId]
    return record?.filePath ? assertPathWithinRoot(pagesRoot, record.filePath) : null
  }

  return {
    async createPage(input) {
      const page = createPageModel(input)
      const filePath = assertPathWithinRoot(pagesRoot, buildPageFilePath(baseDir, page))
      await ensureFileDoesNotExist(filePath)
      await writePageFile(filePath, serializePage({ ...page, filename: path.basename(filePath) }))
      const created = { ...page, filename: path.basename(filePath), filePath }
      await upsertPageIndexEntry(created)
      return created
    },

    async readPageByPath(filePath) {
      const safePath = assertPathWithinRoot(pagesRoot, filePath)
      const text = await fs.readFile(safePath, 'utf8')
      const parsed = parseFrontmatter(text)
      return {
        ...createPageModel(toPageInput(parsed, safePath)),
        filename: path.basename(safePath),
        filePath: safePath
      }
    },

    async readPageById(pageId) {
      const filePath = await getIndexedFilePath(pageId)
      if (!filePath) return null
      return this.readPageByPath(filePath)
    },

    async updatePage(input) {
      const page = createPageModel(input)
      const filePath = assertPathWithinRoot(
        pagesRoot,
        normalizeString(input.filePath) || buildPageFilePath(baseDir, page)
      )
      await writePageFile(filePath, serializePage({ ...page, filename: path.basename(filePath) }))
      const updated = { ...page, filename: path.basename(filePath), filePath }
      await upsertPageIndexEntry(updated)
      return updated
    },

    async deletePage({ pageId, filePath }) {
      const resolvedFilePath = filePath
        ? assertPathWithinRoot(pagesRoot, filePath)
        : await getIndexedFilePath(pageId)
      if (!resolvedFilePath) return false
      await fs.rm(resolvedFilePath, { force: true })
      if (pageId) {
        await deletePageIndexEntry(pageId)
      }
      return true
    },

    async listIndexedPages() {
      const indexMap = await readPageIndex()
      return Object.values(indexMap).sort((a, b) => String(a.title).localeCompare(String(b.title), 'zh-CN'))
    },

    serializePage,
    parsePage(text, filePath = '') {
      return {
        ...createPageModel(toPageInput(parseFrontmatter(text), filePath)),
        filePath: normalizeString(filePath)
      }
    },

    getPagesRoot() {
      return pagesRoot
    },

    getPageIndexPath() {
      return pageIndexPath
    }
  }
}

export { assertPathWithinRoot, sanitizeFileSegment, serializePage, parseFrontmatter }
