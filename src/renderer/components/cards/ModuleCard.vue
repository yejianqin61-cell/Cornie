<script setup>
import { Badge, Button } from 'neobrutalism-vue'

defineProps({
  icon: { type: Object, required: false, default: null },
  title: { type: String, required: true },
  badge: { type: String, default: '' },
  badgeVariant: { type: String, default: 'default' },
})
</script>

<template>
  <div class="nb-module-card">
    <div class="nb-module-card-head">
      <component v-if="icon" :is="icon" class="nb-module-card-icon" :size="22" />
      <h3 class="nb-module-card-title">{{ title }}</h3>
      <Badge v-if="badge" :variant="badgeVariant" class="nb-module-card-badge">
        {{ badge }}
      </Badge>
    </div>
    <div class="nb-module-card-action">
      <Button variant="outline" size="sm">
        <component v-if="icon" :is="icon" :size="12" />
        <span>进入</span>
      </Button>
    </div>
  </div>
</template>

<style scoped>
.nb-module-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  background: #fff;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 0 #000;
  height: 100%;
  transition:
    transform 0.1s,
    box-shadow 0.1s;
}

.nb-module-card:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 0 #000;
}

.nb-module-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nb-module-card-icon {
  flex-shrink: 0;
  color: #555;
}

.nb-module-card-title {
  font-size: 14px;
  font-weight: 900;
  margin: 0;
  flex: 1;
  text-transform: none;
}

.nb-module-card-badge {
  margin-left: auto;
}

.nb-module-card-action {
  display: flex;
  justify-content: flex-start;
}
</style>
