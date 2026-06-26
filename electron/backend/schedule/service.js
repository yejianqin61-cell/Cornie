import {
  deleteScheduleEntry,
  getScheduleCategory,
  getScheduleEntry,
  listScheduleCategories,
  listScheduleEntries,
  updateScheduleEntryStatus,
  saveScheduleEntry,
  upsertScheduleCategory
} from '../../db.js'
import { normalizeCategoryMapping } from '../category/mapping.js'
import { validateCategoryName } from '../category/validation.js'

function hasOwn(input, key) {
  return Object.prototype.hasOwnProperty.call(input, key)
}

function hasCategoryFields(input) {
  return [
    'categoryId',
    'category_id',
    'categoryName',
    'category_name',
    'needsNewCategory',
    'proposedCategoryName',
    'proposed_category_name',
    'categoryProposalName'
  ].some((key) => hasOwn(input, key))
}

function normalizeScheduleInput(input, { existing = null } = {}) {
  const categoryMapping = normalizeCategoryMapping(input)
  const title = hasOwn(input, 'title')
    ? String(input.title ?? '').trim()
    : existing?.title ?? ''
  const description = hasOwn(input, 'description')
    ? input.description ?? null
    : existing?.description ?? null
  const startAt =
    hasOwn(input, 'startAt') || hasOwn(input, 'start_at')
      ? input.start_at ?? input.startAt ?? null
      : existing?.startAt ?? null
  const endAt =
    hasOwn(input, 'endAt') || hasOwn(input, 'end_at')
      ? input.end_at ?? input.endAt ?? null
      : existing?.endAt ?? null
  const location = hasOwn(input, 'location') ? input.location ?? null : existing?.location ?? null
  const sourceText =
    hasOwn(input, 'sourceText') || hasOwn(input, 'source_text')
      ? input.source_text ?? input.sourceText ?? null
      : existing?.sourceText ?? null
  const useExistingCategory = !hasCategoryFields(input) && existing

  return {
    title,
    description,
    categoryId: useExistingCategory ? existing.categoryId ?? null : categoryMapping.categoryId,
    categoryName: useExistingCategory ? existing.categoryName ?? null : categoryMapping.categoryName,
    needsNewCategory: categoryMapping.needsNewCategory,
    proposedCategoryName: categoryMapping.proposedCategoryName,
    startAt,
    endAt,
    location,
    sourceText
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
      const existing = getScheduleEntry(store, input.id)
      if (!existing) throw new Error('schedule entry not found')
      const schedule = normalizeScheduleInput(input, { existing })
      if (!schedule.title) throw new Error('schedule title is required')
      if (!schedule.startAt) throw new Error('schedule start_at is required')
      return saveScheduleEntry(store, {
        id: input.id,
        ...schedule,
        status: input.status ?? existing.status ?? 'scheduled'
      })
    },
    cancel: ({ id }) => updateScheduleEntryStatus(store, { id, status: 'cancelled' }),
    delete: ({ id }) => {
      if (!id) throw new Error('schedule id is required')
      const existing = getScheduleEntry(store, id)
      if (!existing) throw new Error('schedule entry not found')
      deleteScheduleEntry(store, id)
      return existing
    },
    get: (id) => getScheduleEntry(store, id),
    listToday: () => listScheduleEntries(store, { status: 'scheduled' }),
    listByRange: ({ from, to }) => listScheduleEntries(store, { from, to }),
    listCategories: () => listScheduleCategories(store),
    createCategory: ({ name, id, sortOrder = 0 }) => {
      const validation = validateCategoryName(name, listScheduleCategories(store))

      if (validation.duplicateCategoryId) {
        return {
          ...getScheduleCategory(store, validation.duplicateCategoryId),
          resolution: 'reused_existing'
        }
      }

      if (!validation.ok) {
        const error = new Error(validation.reason || 'invalid category name')
        error.code = validation.similarCandidates?.length > 0 ? 'category_name_similar' : 'invalid_category_name'
        error.details = validation
        throw error
      }

      return upsertScheduleCategory(store, { name: validation.normalizedName, id, sortOrder })
    },
    deleteCategory: ({ id, name, sortOrder }) => {
      if (!id) throw new Error('schedule category id is required')
      const existing = getScheduleCategory(store, id)
      if (!existing) throw new Error('schedule category not found')
      return upsertScheduleCategory(store, {
        id,
        name: name ?? existing.name,
        sortOrder: sortOrder ?? existing.sortOrder,
        isActive: false
      })
    },
    updateCategory: ({ id, name, isActive, sortOrder }) =>
      upsertScheduleCategory(store, { id, name, isActive, sortOrder })
  }
}
