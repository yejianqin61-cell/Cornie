<script setup>
import { computed } from 'vue'

const props = defineProps({
  selectedPage: { type: Object, default: null },
  pageForm: { type: Object, required: true },
  saving: { type: Boolean, default: false },
  pageSourceTrace: { type: Object, default: null },
  selectedVersionId: { type: String, default: '' },
  identityPageOptions: { type: Array, default: () => [] },
  identityRelationshipRules: { type: Array, default: () => [] },
  identityRelationshipCandidates: { type: Array, default: () => [] },
  identityRelationshipWarnings: { type: Array, default: () => [] },
  relatedPageIssues: { type: Array, default: () => [] },
  relatedPageSelection: { type: Array, default: () => [] },
  pageTopicKeyword: { type: String, default: '' },
  pageTopicAliasesText: { type: String, default: '' },
  pageTopicNote: { type: String, default: '' }
})

const emit = defineEmits([
  'reset',
  'save',
  'archive',
  'restore',
  'rollback',
  'save-related-pages',
  'link-topic',
  'update:pageTopicKeyword',
  'update:pageTopicAliasesText',
  'update:pageTopicNote',
  'update:relatedPageSelection'
])

const pageTopicKeywordModel = computed({
  get: () => props.pageTopicKeyword,
  set: (value) => emit('update:pageTopicKeyword', value)
})
const pageTopicAliasesTextModel = computed({
  get: () => props.pageTopicAliasesText,
  set: (value) => emit('update:pageTopicAliasesText', value)
})
const pageTopicNoteModel = computed({
  get: () => props.pageTopicNote,
  set: (value) => emit('update:pageTopicNote', value)
})
const relatedPageSelectionModel = computed({
  get: () => props.relatedPageSelection,
  set: (value) => emit('update:relatedPageSelection', value)
})
</script>

<template>
  <section class="workspaceCard">
    <div class="cardHead">
      <div>
        <div class="cardTitle">{{ selectedPage ? '编辑页面' : '新建页面' }}</div>
      </div>
      <button v-if="selectedPage" @click="emit('reset')">新建页面</button>
    </div>

    <div class="formGrid">
      <label>
        <span>页面类型</span>
        <select v-model="pageForm.pageType">
          <option value="topic">topic</option>
          <option value="person">person</option>
          <option value="event">event</option>
          <option value="preference">preference</option>
          <option value="identity_profile">identity_profile</option>
          <option value="identity_person">identity_person</option>
          <option value="identity_preference">identity_preference</option>
          <option value="identity_trait">identity_trait</option>
        </select>
      </label>
      <label>
        <span>状态</span>
        <select v-model="pageForm.status">
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="archived">archived</option>
        </select>
      </label>
      <label class="span2">
        <span>标题</span>
        <input v-model="pageForm.title" placeholder="输入页面标题" />
      </label>
      <template v-if="pageForm.pageType === 'identity_profile'">
        <label>
          <span>用户名字</span>
          <input v-model="pageForm.userName" placeholder="例如：叶健钦" />
        </label>
        <label>
          <span>偏好称呼</span>
          <input v-model="pageForm.preferredName" placeholder="例如：爸爸" />
        </label>
        <label class="span2">
          <span>与 Cornie 的关系</span>
          <input v-model="pageForm.cornieRelationship" placeholder="例如：用户是 Cornie 的创造者，也是 Cornie 的爸爸" />
        </label>
        <label class="span2">
          <span>身份摘要</span>
          <textarea v-model="pageForm.identitySummary" rows="3" placeholder="例如：当前处于项目、考试、实习与求职压力交织阶段。" />
        </label>
        <label class="span2">
          <span>阶段概况</span>
          <textarea v-model="pageForm.lifeStageSummary" rows="3" placeholder="例如：学业推进中，同时承担多个个人项目与求职任务。" />
        </label>
        <label>
          <span>当前关注</span>
          <input v-model="pageForm.currentFocus" placeholder="例如：项目推进、考试、实习" />
        </label>
        <label>
          <span>主要压力</span>
          <input v-model="pageForm.stressors" placeholder="例如：时间压力、项目并行、求职焦虑" />
        </label>
        <label class="span2">
          <span>沟通偏好</span>
          <textarea v-model="pageForm.communicationPreference" rows="2" placeholder="例如：希望被温柔、克制、记得上下文地陪伴。" />
        </label>
      </template>
      <template v-if="pageForm.pageType === 'identity_preference'">
        <label>
          <span>偏好类型</span>
          <select v-model="pageForm.preferenceType">
            <option value="">未分类</option>
            <option value="饮食">饮食</option>
            <option value="交流">交流</option>
            <option value="风格">风格</option>
            <option value="作息">作息</option>
            <option value="情感表达">情感表达</option>
          </select>
        </label>
        <label>
          <span>立场</span>
          <select v-model="pageForm.stance">
            <option value="">未标注</option>
            <option value="喜欢">喜欢</option>
            <option value="不喜欢">不喜欢</option>
            <option value="中性偏好">中性偏好</option>
          </select>
        </label>
        <label>
          <span>稳定性</span>
          <select v-model="pageForm.stabilityLevel">
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <label>
          <span>证据计数</span>
          <input v-model="pageForm.evidenceCount" type="number" min="0" />
        </label>
        <label class="span2">
          <span>最近确认时间</span>
          <input v-model="pageForm.lastConfirmedAt" placeholder="例如：2026-06-29" />
        </label>
        <label class="span2">
          <span>触发关键词（逗号分隔）</span>
          <input v-model="pageForm.triggerKeywordsText" placeholder="例如：奶茶, 咖啡, 甜度" />
        </label>
      </template>
      <template v-if="pageForm.pageType === 'identity_person'">
        <label>
          <span>人物名字</span>
          <input v-model="pageForm.personName" placeholder="例如：钟奕菲" />
        </label>
        <label>
          <span>与用户关系</span>
          <input v-model="pageForm.relationshipToUser" placeholder="例如：初恋、朋友、家人" />
        </label>
        <label class="span2">
          <span>身份摘要</span>
          <textarea v-model="pageForm.roleSummary" rows="2" placeholder="例如：用户人生中具有高情感权重的重要人物。" />
        </label>
        <label class="span2">
          <span>性格摘要</span>
          <textarea v-model="pageForm.personalitySummary" rows="2" placeholder="例如：温柔、害羞、内向。" />
        </label>
        <label class="span2">
          <span>共同经历</span>
          <textarea v-model="pageForm.sharedExperienceSummary" rows="3" placeholder="例如：2021年冬天相恋，2022年春天疏远，2022年夏天决裂。" />
        </label>
        <label>
          <span>情感权重</span>
          <input v-model="pageForm.emotionalWeight" placeholder="例如：high / 很高" />
        </label>
        <label>
          <span>首次已知阶段</span>
          <input v-model="pageForm.firstKnownPeriod" placeholder="例如：2021年冬天" />
        </label>
        <label class="span2">
          <span>时间线摘要</span>
          <textarea v-model="pageForm.timelineSummary" rows="2" placeholder="例如：相恋-疏远-决裂。" />
        </label>
      </template>
      <template v-if="pageForm.pageType === 'identity_trait'">
        <label>
          <span>侧写类型</span>
          <select v-model="pageForm.traitType">
            <option value="">未分类</option>
            <option value="性格倾向">性格倾向</option>
            <option value="情绪模式">情绪模式</option>
            <option value="沟通风格">沟通风格</option>
            <option value="压力反应">压力反应</option>
            <option value="关系状态">关系状态</option>
          </select>
        </label>
        <label>
          <span>置信度</span>
          <select v-model="pageForm.confidenceLevel">
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <label>
          <span>稳定性</span>
          <select v-model="pageForm.stabilityLevel">
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <label>
          <span>主人确认</span>
          <select v-model="pageForm.ownerConfirmed">
            <option :value="false">未确认</option>
            <option :value="true">已确认</option>
          </select>
        </label>
        <label class="span2">
          <span>侧写摘要</span>
          <textarea v-model="pageForm.traitSummary" rows="3" placeholder="例如：高压时容易疲惫，但会努力把情绪转成行动。" />
        </label>
        <label>
          <span>证据计数</span>
          <input v-model="pageForm.evidenceCount" type="number" min="0" />
        </label>
        <label>
          <span>最近确认时间</span>
          <input v-model="pageForm.lastConfirmedAt" placeholder="例如：2026-06-29" />
        </label>
        <label class="span2">
          <span>触发关键词（逗号分隔）</span>
          <input v-model="pageForm.triggerKeywordsText" placeholder="例如：压力, 焦虑, 安慰, 累" />
        </label>
      </template>
      <label class="span2">
        <span>摘要</span>
        <textarea v-model="pageForm.summary" rows="4" placeholder="写一段简短摘要" />
      </label>
      <label class="span2">
        <span>正文</span>
        <textarea v-model="pageForm.body" rows="10" placeholder="这里是页面正文 Markdown" />
      </label>
      <label class="span2">
        <span>别名（逗号分隔）</span>
        <input v-model="pageForm.aliasesText" placeholder="例如：龙虾, 澳洲龙虾" />
      </label>
      <label>
        <span>重要性</span>
        <select v-model="pageForm.importance">
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
      </label>
      <label>
        <span>页面 ID</span>
        <input :value="pageForm.pageId || '保存后生成'" disabled />
      </label>
    </div>

    <div class="actionRow">
      <button class="primary" :disabled="saving" @click="emit('save')">{{ saving ? '保存中…' : '保存页面' }}</button>
      <button v-if="pageForm.pageId && pageForm.status !== 'archived'" :disabled="saving" @click="emit('archive')">归档页面</button>
      <button v-if="pageForm.pageId && pageForm.status === 'archived'" :disabled="saving" @click="emit('restore')">恢复页面</button>
      <button v-if="pageForm.pageId" :disabled="saving || !selectedVersionId" @click="emit('rollback')">
        {{ selectedVersionId ? '回滚到当前选中版本' : '先选择版本再回滚' }}
      </button>
    </div>

    <div v-if="pageSourceTrace && pageForm.pageId" class="detailSection">
      <div class="evidenceTitle">来源追溯</div>
      <div class="detailMeta">关联页面：{{ (pageSourceTrace.relatedPages || []).map((item) => item.title).join(', ') || '无' }}</div>
      <div class="detailMeta">聊天来源：{{ (pageSourceTrace.chatSources || []).map((item) => item.date).join(', ') || '无' }}</div>
      <div class="detailMeta">观察来源：{{ (pageSourceTrace.observationSources || []).map((item) => item.title).join(', ') || '无' }}</div>
      <div v-if="(pageSourceTrace.chatSources || []).length > 0" class="evidenceBlock">
        <div class="evidenceTitle">聊天片段</div>
        <div class="evidenceCards">
          <div v-for="item in pageSourceTrace.chatSources" :key="`${item.date}-${item.messageId}`" class="evidenceCard">
            <div class="evidenceSummary">{{ item.title }}</div>
            <div class="detailMeta">{{ item.preview || '原消息已不可读' }}</div>
          </div>
        </div>
      </div>
      <div v-if="(pageSourceTrace.observationSources || []).length > 0" class="evidenceBlock">
        <div class="evidenceTitle">观察记录</div>
        <div class="evidenceCards">
          <div v-for="item in pageSourceTrace.observationSources" :key="item.observationId" class="evidenceCard">
            <div class="evidenceSummary">{{ item.title }}</div>
            <div class="detailMeta">{{ item.preview || '原观察记录已不可读' }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="pageForm.pageId && pageForm.pageType.startsWith('identity_')" class="detailSection">
      <div class="evidenceTitle">Identity 关系链路</div>

      <div v-if="identityRelationshipRules.length > 0" class="suggestionList">
        <div v-for="item in identityRelationshipRules" :key="item" class="suggestionItem">{{ item }}</div>
      </div>

      <div class="formGrid relationshipGrid">
        <label class="span2">
          <span>关联 Identity 页面</span>
          <select v-model="relatedPageSelectionModel" multiple size="6">
            <option v-for="item in identityPageOptions" :key="item.pageId" :value="item.pageId">
              {{ item.title }} · {{ item.pageType }} · {{ item.status }}
            </option>
          </select>
        </label>
      </div>

      <div class="actionRow">
        <button :disabled="saving" @click="emit('save-related-pages')">{{ saving ? '保存中…' : '保存关系链路' }}</button>
      </div>

      <div v-if="identityRelationshipCandidates.length > 0" class="detailSection">
        <div class="evidenceTitle">推荐补链</div>
        <div class="suggestionList">
          <div
            v-for="item in identityRelationshipCandidates"
            :key="item.pageId"
            class="suggestionItem"
          >
            {{ item.title }} · {{ item.pageType }} · {{ item.linked ? '已关联' : '可补充关联' }}
          </div>
        </div>
      </div>

      <div v-if="identityRelationshipWarnings.length > 0" class="detailSection">
        <div class="evidenceTitle">治理提醒</div>
        <div class="suggestionList">
          <div v-for="item in identityRelationshipWarnings" :key="item" class="suggestionItem warningItem">{{ item }}</div>
        </div>
      </div>

      <div v-if="relatedPageIssues.length > 0" class="detailSection">
        <div class="evidenceTitle">关联异常</div>
        <div class="suggestionList">
          <div
            v-for="item in relatedPageIssues"
            :key="`${item.issueType}-${item.relatedPageId}`"
            class="suggestionItem warningItem"
          >
            {{ item.message || `${item.issueType} · ${item.relatedPageId}` }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="pageForm.pageId && pageForm.pageType === 'identity_person'" class="detailSection">
      <div class="evidenceTitle">人物页联动 Topic</div>
      <div class="formGrid topicLinkGrid">
        <label>
          <span>主题关键词</span>
          <input v-model="pageTopicKeywordModel" placeholder="例如：钟奕菲" />
        </label>
        <label>
          <span>沿用重要性</span>
          <input :value="pageForm.importance" disabled />
        </label>
        <label class="span2">
          <span>主题别名（逗号分隔）</span>
          <input v-model="pageTopicAliasesTextModel" placeholder="例如：奕菲, 钟同学" />
        </label>
        <label class="span2">
          <span>索引备注</span>
          <textarea v-model="pageTopicNoteModel" rows="3" placeholder="给这个人物主题留一句简短备注" />
        </label>
      </div>
      <div class="actionRow">
        <button :disabled="saving || !pageTopicKeywordModel.trim()" @click="emit('link-topic')">
          {{ saving ? '联动中…' : '联动到 Topic Index' }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.workspaceCard{
  background: rgba(255,255,255,.05);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 16px;
  display:flex;
  flex-direction:column;
  gap: 14px;
  min-height: 0;
}
.cardHead{
  display:flex;
  justify-content: space-between;
  align-items:flex-start;
  gap: 12px;
}
.cardTitle{ font-weight: 800; font-size: 16px; }
.cardSubhint{ margin-top: 4px; color: var(--muted); font-size: 12px; }
.formGrid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.formGrid label{
  display:flex;
  flex-direction:column;
  gap: 6px;
  font-size: 13px;
}
.formGrid .span2{
  grid-column: 1 / -1;
}
.actionRow{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
}
.detailSection{
  margin-top: 14px;
}
.detailMeta{ margin-top: 8px; color: var(--muted); font-size: 13px; line-height: 1.5; }
.evidenceBlock{
  margin-top: 14px;
  display:flex;
  flex-direction:column;
  gap: 10px;
}
.evidenceTitle{
  font-size: 13px;
  font-weight: 700;
}
.evidenceCards{
  display:flex;
  flex-direction:column;
  gap: 10px;
}
.evidenceCard{
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255,255,255,.02);
  padding: 12px;
}
.evidenceSummary{
  font-size: 12px;
  font-weight: 700;
  color: rgba(248,250,252,.92);
  margin-bottom: 8px;
}
.suggestionList{
  margin-top: 10px;
  display:flex;
  flex-direction:column;
  gap: 8px;
}
.suggestionItem{
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.03);
  color: rgba(255,255,255,.88);
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}
.warningItem{
  border-color: rgba(248, 113, 113, .24);
  background: rgba(248, 113, 113, .08);
}
.relationshipGrid select{
  min-height: 160px;
}
@media (max-width: 720px){
  .cardHead{
    flex-direction: column;
  }
  .formGrid{
    grid-template-columns: 1fr;
  }
}
</style>
