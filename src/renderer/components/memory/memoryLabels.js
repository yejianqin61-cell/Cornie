export const REQUEST_TYPE_LABELS = {
  memory_wiki_llm_proposal: 'LLM 记忆变更提议',
  identity_person_review: '人物信息复核',
  identity_person_relationship_conflict: '人物关系冲突',
  identity_profile_conflict: '主人画像冲突',
  identity_trait_review: '性格侧写复核',
  repair_suggestion: '巡检修复建议',
  archive_candidate: '归档候选',
  observation_compression_candidate: '观察日志压缩候选',
  identity_profile_upgrade_candidate: '观察升级为画像',
  identity_preference_upgrade_candidate: '观察升级为偏好',
  identity_trait_upgrade_candidate: '观察升级为性格侧写',
  identity_person_upgrade_candidate: '观察升级为人物',
}

export const STATUS_LABELS = {
  pending: '待审',
  approved: '已批准',
  rejected: '已拒绝',
  deferred: '已延期',
  applied: '已应用',
}

export const ACTION_LABELS = {
  create_page: '新建页面',
  update_page: '更新页面',
  merge_pages: '合并页面',
  rollback_page: '回滚页面',
  archive_page: '归档页面',
  delete_page: '删除页面',
}

export const REPAIR_KIND_LABELS = {
  unlink_topic_page: '解除失效的主题页面引用',
  remove_related_page: '移除失效的关联页面',
  remove_page_source_ref: '移除失效的来源引用',
  unlink_topic_chat_ref: '解除失效的主题聊天引用',
  unlink_topic_observation_ref: '解除失效的主题观察引用',
  review_or_archive_page: '核对或归档页面',
}

export function labelOf(table, key) {
  return table[key] || key || ''
}

export function plannedActionLabel(request) {
  const action = request?.payload?.request?.action || request?.payload?.action
  if (action) return labelOf(ACTION_LABELS, action)
  const kind = request?.payload?.kind
  return kind ? labelOf(REPAIR_KIND_LABELS, kind) : ''
}
