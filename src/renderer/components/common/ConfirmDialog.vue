<script setup>
import { AlertTriangle } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'

defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  error: { type: String, default: '' },
  onConfirm: { type: Function, required: true },
  onCancel: { type: Function, required: true },
})
</script>

<template>
  <div v-if="open" class="confirm-overlay" @click.self="onCancel">
    <div class="confirm-dialog">
      <div class="confirm-dialog-head">
        <AlertTriangle :size="22" />
        <h3 class="confirm-dialog-title">{{ title }}</h3>
      </div>
      <p class="confirm-dialog-message">{{ message }}</p>
      <p v-if="error" class="confirm-dialog-error">{{ error }}</p>
      <div class="confirm-dialog-actions">
        <Button variant="outline" size="sm" @click="onCancel">
          取消
        </Button>
        <Button variant="primary" size="sm" @click="onConfirm">
          确认
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-dialog {
  background: #fff;
  border: 3px solid #000;
  box-shadow: 6px 6px 0 0 #000;
  padding: 20px;
  max-width: 360px;
  width: 90%;
}

.confirm-dialog-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.confirm-dialog-title {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
}

.confirm-dialog-message {
  margin: 0 0 16px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  line-height: 1.5;
}

.confirm-dialog-error {
  margin: -8px 0 16px;
  color: var(--nb-danger, #d32f2f);
  font-size: 13px;
  font-weight: 600;
}

.confirm-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
