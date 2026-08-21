const CATEGORY_DECISION_SCHEMA = `当工具参数涉及类目映射时，额外遵守以下 categoryDecision 语义：
{
  "categoryDecision": {
    "mode": "mapped | needs_confirmation | ask_back",
    "domain": "ledger | todo | schedule",
    "categoryId": "可选，命中现有类目时优先给",
    "categoryName": "可选，命中现有类目时尽量给",
    "needsNewCategory": false,
    "proposedCategoryName": null,
    "reason": "说明为什么这样判断"
  }
}

注意：categoryDecision 是你思考类目映射时必须遵循的语义约束，不要求把它原样输出为顶层字段，但 tool_call.arguments 必须与它保持一致。`

const CATEGORY_PRIORITY_RULES = `类目映射优先级：
1. 先使用当前上下文里的现有类目清单。
2. 如果现有摘要不够判断，可先调用只读类目查询工具补查。
3. 只有确认没有合适现有类目时，才允许提出新增类目请求。
4. 未经确认，不得自行创建新类目。
5. 一旦已经命中现有类目，就不要再返回 needsNewCategory=true。`

const CATEGORY_FIELD_RULES = `类目字段约束：
- categoryId: 已命中的现有类目 id，能给就优先给
- categoryName: 已命中的现有类目名称，可作为补充
- needsNewCategory: 只有在现有类目都不合适时才返回 true
- proposedCategoryName: 只有 needsNewCategory=true 时才允许填写

禁止：
- 不要同时输出 categoryId/categoryName 和 needsNewCategory=true
- 不要在 proposedCategoryName 里塞整句描述
- 不要只给模糊类目名，如“其他”“这个”“那个”“杂项”
- 不要把低相关类目强行当作已命中结果`

const CATEGORY_FALLBACK_RULES = `当信息不足时的处理顺序：
1. 如果当前快照或补查结果已经足够，直接命中现有类目。
2. 如果仍然存在多个接近候选，优先让系统进入确认，而不是自己乱定。
3. 如果金额、标题、时间、类目等关键字段缺失，优先 reply 追问。
4. 如果补查过一次仍不确定，不要继续补查第二次，直接 reply 追问。`

const CATEGORY_DOMAIN_HINTS = `涉及类目映射的常见工具：
- ledger.add_expense / ledger.add_income / ledger.update_entry
- todo.create / todo.update
- schedule.create / schedule.update

对于这些工具：
- 命中现有类目：tool_call.arguments 中填 categoryId/categoryName
- 需要新增类目：tool_call.arguments 中填 needsNewCategory=true + proposedCategoryName
- 仍然不确定：优先输出 reply，向主人追问`

const LEDGER_FIELD_RULES = `记账字段补全规则：
- 对于 ledger.add_expense / ledger.add_income，除了金额和类目，还要尽量补全 item。
- item 表示这笔钱“具体花在了什么/具体来自什么”，应该短、具体、可读，例如“午饭”“打车去公司”“工资”“卖闲置”。
- 如果用户说了明确事项，必须优先写入 item，不要只写 categoryName。
- 如果只能判断大类、无法判断具体事项，才允许 item 为空。
- merchant 只有在用户明确提到店名、平台名、商户名时再填写，例如“瑞幸”“淘宝”“盒马”。
- 不要把整句原话塞进 item；item 也不要只写“消费”“支出”“收入”这种空泛词。`

export function buildCategoryMappingProtocol() {
  return [
    CATEGORY_DECISION_SCHEMA,
    CATEGORY_PRIORITY_RULES,
    CATEGORY_FIELD_RULES,
    CATEGORY_FALLBACK_RULES,
    CATEGORY_DOMAIN_HINTS,
    LEDGER_FIELD_RULES
  ].join('\n\n')
}

export function buildCategoryLookupFollowupRules() {
  return [
    '你现在看到的是刚补查到的只读结果。',
    '这轮优先任务是：根据补查结果判断能否命中现有类目。',
    '如果补查结果已足够，不要再提新增类目。',
    '如果补查结果仍然不足，就输出 reply 追问，不要继续请求新的只读补查。',
    '如果最终决定继续调用业务工具，arguments 中仍要遵守 categoryId/categoryName 与 needsNewCategory/proposedCategoryName 的互斥规则。'
  ].join('\n')
}
