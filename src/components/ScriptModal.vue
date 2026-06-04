<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-box">
      <div class="modal-header">
        <span>{{ isEdit ? '编辑文案' : '新建文案' }}</span>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <input
          ref="titleRef"
          v-model="form.title"
          class="modal-title-input"
          placeholder="输入标题"
          maxlength="40"
        />
        <textarea
          v-model="form.text"
          class="modal-text-input"
          placeholder="输入提词文案内容..."
          rows="10"
        ></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn modal-btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn modal-btn-save" @click="onSave">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  script: { type: Object, default: null }
})

const emit = defineEmits(['save', 'close'])

const titleRef = ref(null)
const isEdit = ref(false)

const form = reactive({
  title: '',
  text: ''
})

watch(() => props.visible, (val) => {
  if (val) {
    isEdit.value = !!props.script
    form.title = props.script?.title || ''
    form.text = props.script?.text || ''
    nextTick(() => titleRef.value?.focus())
  }
})

function onSave() {
  if (!form.title.trim() && !form.text.trim()) return
  emit('save', {
    id: props.script?.id || null,
    title: form.title.trim(),
    text: form.text.trim()
  })
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal-box {
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a2a;
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
  flex-shrink: 0;
}

.modal-close {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: #2a2a2a;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  overflow-y: auto;
}

.modal-title-input {
  width: 100%;
  padding: 12px;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 14px;
  outline: none;
}

.modal-title-input:focus {
  border-color: #4a9eff;
}

.modal-text-input {
  width: 100%;
  padding: 12px;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  outline: none;
}

.modal-text-input:focus {
  border-color: #4a9eff;
}

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid #2a2a2a;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.modal-btn-cancel {
  background: transparent;
  color: #999;
}

.modal-btn-cancel:hover {
  background: #2a2a2a;
}

.modal-btn-save {
  background: #4a9eff;
  color: #fff;
}

.modal-btn-save:hover {
  background: #3a8eef;
}
</style>
