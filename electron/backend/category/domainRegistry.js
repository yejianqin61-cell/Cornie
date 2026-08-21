import { createLedgerService } from '../ledger/service.js'
import { createTodoService } from '../todo/service.js'
import { createScheduleService } from '../schedule/service.js'

function assertString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`category domain registry requires non-empty string field: ${fieldName}`)
  }
}

function assertFunction(value, fieldName, domain) {
  if (typeof value !== 'function') {
    throw new Error(`category domain "${domain}" requires function field: ${fieldName}`)
  }
}

function formatCategoryItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '无'
  }

  return items.map((item) => `${item.id}:${item.name}`).join('、')
}

function createLookupEntries(domain, entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`category domain "${domain}" requires at least one readOnlyLookup entry`)
  }

  return entries.map((entry, index) => {
    assertString(entry?.toolName, `readOnlyLookups[${index}].toolName`)
    assertString(entry?.lookupType, `readOnlyLookups[${index}].lookupType`)

    return {
      domain,
      toolName: entry.toolName.trim(),
      lookupType: entry.lookupType.trim(),
      categoryType: entry.categoryType ?? null
    }
  })
}

export function createCategoryDomainRegistry(registrations = []) {
  const domainMap = new Map()
  const actionToolMap = new Map()
  const lookupToolMap = new Map()

  for (const registration of registrations) {
    assertString(registration?.domain, 'domain')
    assertString(registration?.label, 'label')
    assertFunction(registration?.getCategoryLists, 'getCategoryLists', registration.domain)
    assertFunction(
      registration?.buildCategoryCreateToolCall,
      'buildCategoryCreateToolCall',
      registration.domain
    )
    assertFunction(registration?.getCategorySnapshot, 'getCategorySnapshot', registration.domain)
    assertFunction(registration?.formatSummaryLines, 'formatSummaryLines', registration.domain)
    assertFunction(
      registration?.summarizeSnapshotForAudit,
      'summarizeSnapshotForAudit',
      registration.domain
    )
    assertFunction(
      registration?.buildRejectResolutionReason,
      'buildRejectResolutionReason',
      registration.domain
    )

    if (domainMap.has(registration.domain)) {
      throw new Error(`duplicate category domain registration: ${registration.domain}`)
    }

    const actionToolNames = Array.isArray(registration.actionToolNames)
      ? registration.actionToolNames.map((item) => String(item).trim()).filter(Boolean)
      : []
    if (actionToolNames.length === 0) {
      throw new Error(`category domain "${registration.domain}" requires actionToolNames`)
    }

    const readOnlyLookups = createLookupEntries(registration.domain, registration.readOnlyLookups)

    const normalizedRegistration = {
      ...registration,
      domain: registration.domain.trim(),
      label: registration.label.trim(),
      actionToolNames,
      readOnlyLookups
    }

    domainMap.set(normalizedRegistration.domain, normalizedRegistration)

    for (const toolName of actionToolNames) {
      if (actionToolMap.has(toolName)) {
        throw new Error(`duplicate category action tool registration: ${toolName}`)
      }
      actionToolMap.set(toolName, normalizedRegistration)
    }

    for (const lookupEntry of readOnlyLookups) {
      if (lookupToolMap.has(lookupEntry.toolName)) {
        throw new Error(`duplicate category lookup tool registration: ${lookupEntry.toolName}`)
      }
      lookupToolMap.set(lookupEntry.toolName, lookupEntry)
    }
  }

  return {
    listDomains() {
      return [...domainMap.keys()]
    },

    getDomain(domain) {
      return domainMap.get(domain) ?? null
    },

    getDomainByActionTool(toolName) {
      return actionToolMap.get(toolName) ?? null
    },

    getLookupContext(toolName) {
      return lookupToolMap.get(toolName) ?? null
    },

    isReadOnlyLookupTool(toolName) {
      return lookupToolMap.has(toolName)
    },

    getReadOnlyLookupDomain(toolName) {
      return lookupToolMap.get(toolName)?.domain ?? null
    },

    // BE-02：单一事实源——全部"类目域写工具"名单（jsonProtocol / orchestrator / prompt 均由此派生）
    getAllActionToolNames() {
      return [...actionToolMap.keys()]
    }
  }
}

const ledgerRegistration = {
  domain: 'ledger',
  label: '收支',
  // BE-02：补注册 update_entry，使协议校验/策略类目处理/提示词三层行为一致
  actionToolNames: ['ledger.add_expense', 'ledger.add_income', 'ledger.update_entry'],
  readOnlyLookups: [
    {
      toolName: 'ledger_category.list_expense',
      lookupType: 'category',
      categoryType: 'expense'
    },
    {
      toolName: 'ledger_category.list_income',
      lookupType: 'category',
      categoryType: 'income'
    }
  ],
  categoryRuleCopy: {
    missingQuestion: '这笔收支更像哪一类呀？如果现有类目都不合适，小铃湾也可以先帮你申请新增。',
    vagueNameQuestion:
      '如果要新增类目，这笔收支你想起一个更明确的类目名吗？比如“猫咪用品”这种，小铃湾才好帮你申请。',
    vagueNameReason: '建议新增的类目名还不够明确。',
    createConfirmReason: '当前收支找不到合适类目，建议先新增类目，等待主人确认。',
    missingReason: '还缺少这个收支应归属的类目信息。'
  },
  validateToolCall(toolCall) {
    const amount = toolCall?.arguments?.amount
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return {
        decision: 'ask_back',
        question: '这笔收支的金额是多少呀？小铃湾需要确认后才能记下。',
        reason: '还缺少这笔收支的金额信息。',
        toolCall
      }
    }
    return null
  },
  getCategoryLists(store, { toolName } = {}) {
    if (!store) {
      return []
    }
    const ledger = createLedgerService(store)
    if (toolName === 'ledger.add_income') {
      return ledger.listIncomeCategories()
    }
    // update_entry 类型不固定：返回合并列表，策略层从中匹配/追问
    if (toolName === 'ledger.update_entry') {
      return [...ledger.listIncomeCategories(), ...ledger.listExpenseCategories()]
    }
    return ledger.listExpenseCategories()
  },
  buildCategoryCreateToolCall({ pendingActionToolName, proposedCategoryName }) {
    return {
      tool_name:
        pendingActionToolName === 'ledger.add_income'
          ? 'ledger_category.create_income'
          : 'ledger_category.create_expense',
      arguments: {
        name: proposedCategoryName
      }
    }
  },
  buildRejectResolutionReason(mode) {
    if (mode === 'suggest_existing_category') {
      return '主人拒绝新增后，建议改用现有收支类目。'
    }
    if (mode === 'ask_user_pick_existing') {
      return '主人拒绝新增后，已有多个接近的收支类目，需要主人手动挑一个。'
    }
    return '主人拒绝新增后，本次不继续写入。'
  },
  getCategorySnapshot(store) {
    const ledger = createLedgerService(store)
    return {
      income: ledger.listIncomeCategories(),
      expense: ledger.listExpenseCategories()
    }
  },
  summarizeSnapshotForAudit(snapshot) {
    return `ledger_income=${snapshot.income.length}, ledger_expense=${snapshot.expense.length}`
  },
  formatSummaryLines(snapshot) {
    return [
      '收支类目：',
      `- income: ${formatCategoryItems(snapshot.income)}`,
      `- expense: ${formatCategoryItems(snapshot.expense)}`
    ]
  }
}

const todoRegistration = {
  domain: 'todo',
  label: '待办',
  actionToolNames: ['todo.create', 'todo.update'],
  readOnlyLookups: [
    {
      toolName: 'todo_category.list',
      lookupType: 'category',
      categoryType: null
    },
    {
      toolName: 'todo.list_today',
      lookupType: 'todo_items',
      categoryType: null
    },
    {
      toolName: 'todo.list_by_range',
      lookupType: 'todo_items',
      categoryType: null
    },
    {
      toolName: 'todo.get',
      lookupType: 'todo_items',
      categoryType: null
    }
  ],
  categoryRuleCopy: {
    missingQuestion: '这个待办你希望放到哪个分类里呢？如果没有合适的，我也可以先帮你提请新增。',
    vagueNameQuestion:
      '如果要新增待办分类，你想给它起个更明确的名字吗？这样小铃湾才能更稳地帮你创建。',
    vagueNameReason: '建议新增的待办类目名还不够明确。',
    createConfirmReason: '当前待办找不到合适分类，建议先新增待办类目，等待主人确认。',
    missingReason: '还缺少这个待办应归属的类目信息。'
  },
  getCategoryLists(store) {
    if (!store) {
      return []
    }
    return createTodoService(store).listCategories()
  },
  inferImplicitCategory(store) {
    if (!store) {
      return null
    }
    const categories = createTodoService(store).listCategories()
    return (
      categories.find((item) => item.id === 'todo_general' && item.isActive !== false) ??
      categories.find((item) => item.name === '待办' && item.isActive !== false) ??
      null
    )
  },
  buildCategoryCreateToolCall({ proposedCategoryName }) {
    return {
      tool_name: 'todo_category.create',
      arguments: {
        name: proposedCategoryName
      }
    }
  },
  buildRejectResolutionReason(mode) {
    if (mode === 'suggest_existing_category') {
      return '主人拒绝新增后，建议改用现有待办类目。'
    }
    if (mode === 'ask_user_pick_existing') {
      return '主人拒绝新增后，已有多个接近的待办类目，需要主人手动挑一个。'
    }
    return '主人拒绝新增后，本次不继续写入。'
  },
  getCategorySnapshot(store) {
    return createTodoService(store).listCategories()
  },
  summarizeSnapshotForAudit(snapshot) {
    return `todo=${snapshot.length}`
  },
  formatSummaryLines(snapshot) {
    return [`待办类目：${formatCategoryItems(snapshot)}`]
  }
}

const scheduleRegistration = {
  domain: 'schedule',
  label: '日程',
  actionToolNames: ['schedule.create', 'schedule.update'],
  readOnlyLookups: [
    {
      toolName: 'schedule_category.list',
      lookupType: 'category',
      categoryType: null
    },
    {
      toolName: 'schedule.list_today',
      lookupType: 'schedule_items',
      categoryType: null
    },
    {
      toolName: 'schedule.list_by_range',
      lookupType: 'schedule_items',
      categoryType: null
    },
    {
      toolName: 'schedule.get',
      lookupType: 'schedule_items',
      categoryType: null
    }
  ],
  categoryRuleCopy: {
    missingQuestion: '这个日程想归到哪个分类呀？如果没有现成的分类，小铃湾可以先帮你申请新增。',
    vagueNameQuestion:
      '如果要新增日程分类，这个名字还可以再具体一点吗？小铃湾想先确认得更稳一些。',
    vagueNameReason: '建议新增的日程类目名还不够明确。',
    createConfirmReason: '当前日程找不到合适分类，建议先新增日程类目，等待主人确认。',
    missingReason: '还缺少这个日程应归属的类目信息。'
  },
  getCategoryLists(store) {
    if (!store) {
      return []
    }
    return createScheduleService(store).listCategories()
  },
  inferImplicitCategory(store) {
    if (!store) {
      return null
    }
    const categories = createScheduleService(store).listCategories()
    return (
      categories.find((item) => item.id === 'schedule_general' && item.isActive !== false) ??
      categories.find((item) => item.name === '日程' && item.isActive !== false) ??
      null
    )
  },
  buildCategoryCreateToolCall({ proposedCategoryName }) {
    return {
      tool_name: 'schedule_category.create',
      arguments: {
        name: proposedCategoryName
      }
    }
  },
  buildRejectResolutionReason(mode) {
    if (mode === 'suggest_existing_category') {
      return '主人拒绝新增后，建议改用现有日程类目。'
    }
    if (mode === 'ask_user_pick_existing') {
      return '主人拒绝新增后，已有多个接近的日程类目，需要主人手动挑一个。'
    }
    return '主人拒绝新增后，本次不继续写入。'
  },
  getCategorySnapshot(store) {
    return createScheduleService(store).listCategories()
  },
  summarizeSnapshotForAudit(snapshot) {
    return `schedule=${snapshot.length}`
  },
  formatSummaryLines(snapshot) {
    return [`日程类目：${formatCategoryItems(snapshot)}`]
  }
}

export const categoryDomainRegistry = createCategoryDomainRegistry([
  ledgerRegistration,
  todoRegistration,
  scheduleRegistration
])
