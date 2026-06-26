import {
  listScheduleCategories,
  listScheduleEntries,
  updateScheduleEntryStatus,
  saveScheduleEntry,
  upsertScheduleCategory
} from '../../db.js'
import { normalizeCategoryMapping } from '../category/mapping.js'

function normalizeScheduleInput(input) {
  const categoryMapping = normalizeCategoryMapping(input)

  return {
    title: String(input.title ?? '').trim(),
    description: input.description ?? null,
    categoryId: categoryMapping.categoryId,
    categoryName: categoryMapping.categoryName,
    needsNewCategory: categoryMapping.needsNewCategory,
    proposedCategoryName: categoryMapping.proposedCategoryName,
    startAt: input.start_at ?? input.startAt ?? null,
    endAt: input.end_at ?? input.endAt ?? null,
    location: input.location ?? null,
    sourceText: input.source_text ?? input.sourceText ?? null
  }
}

export function createScheduleService(store) {
  return {
    create: (input) => {
      const schedule = normalizeScheduleInput(input)
      if (!schedule.title) throw new Error('schedule title is required')
      if (!schedule.startAt) throw new Error('schedule start_at is required')
      return saveScheduleEntry(store, {
        ...schedule,
        status: 'scheduled'
      })
    },
    update: (input) => {
      if (!input.id) throw new Error('schedule id is required')
      return saveScheduleEntry(store, { id: input.id, ...normalizeScheduleInput(input), status: input.status ?? 'scheduled' })
    },
    cancel: ({ id }) => updateScheduleEntryStatus(store, { id, status: 'cancelled' }),
    get: (id) => listScheduleEntries(store, {}).find((item) => item.id === id) ?? null,
    listToday: () => listScheduleEntries(store, { status: 'scheduled' }),
    listByRange: ({ from, to }) => listScheduleEntries(store, { from, to }),
    listCategories: () => listScheduleCategories(store),
    createCategory: ({ name, id, sortOrder = 0 }) =>
      upsertScheduleCategory(store, { name, id, sortOrder }),
    updateCategory: ({ id, name, isActive, sortOrder }) =>
      upsertScheduleCategory(store, { id, name, isActive, sortOrder })
  }
}
