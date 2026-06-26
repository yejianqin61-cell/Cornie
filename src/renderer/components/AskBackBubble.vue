<script setup>
const props = defineProps({
  question: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div class="askBackBubble">
    <div class="askBackRole">Cornie 还想确认一下</div>
    <div class="askBackQuestion">{{ props.question }}</div>
    <div v-if="props.reason" class="askBackReason">
      <span class="askBackReasonLabel">原因：</span>{{ props.reason }}
    </div>
  </div>
</template>

<style scoped>
.askBackBubble{
  width: 100%;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(125,211,252,.22);
  background: rgba(8,47,73,.42);
}

.askBackRole{
  font-size: 10px;
  color: rgba(125,211,252,.72);
}

.askBackQuestion{
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(224,242,254,.95);
  white-space: pre-wrap;
  word-break: break-word;
}

.askBackReason{
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.45;
  color: rgba(186,230,253,.72);
  white-space: pre-wrap;
  word-break: break-word;
}

.askBackReasonLabel{
  color: rgba(224,242,254,.82);
}
</style>
