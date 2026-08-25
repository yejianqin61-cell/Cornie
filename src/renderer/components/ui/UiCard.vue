<script setup>
defineProps({
  title: { type: String, default: '' },
  subhint: { type: String, default: '' },
})
</script>

<template>
  <section class="uiCard">
    <div v-if="$slots.head || title" class="uiCardHead">
      <div v-if="$slots.head" class="uiCardHeadMain">
        <slot name="head" />
      </div>
      <div v-else class="uiCardHeadMain">
        <div class="uiCardTitle">{{ title }}</div>
        <div v-if="subhint" class="uiCardSubhint">{{ subhint }}</div>
      </div>
      <div v-if="$slots.actions" class="uiCardActions">
        <slot name="actions" />
      </div>
    </div>
    <div class="uiCardBody">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.uiCard {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: var(--radius-2xl);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.uiCardHead {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.uiCardHeadMain {
  min-width: 0;
}
.uiCardTitle {
  font-weight: 800;
  font-size: var(--text-lg);
}
.uiCardSubhint {
  margin-top: 4px;
  color: var(--muted);
  font-size: var(--text-sm);
}
.uiCardActions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.uiCardBody {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}
@media (max-width: 720px) {
  .uiCardHead {
    flex-direction: column;
  }
}
</style>
