<template>
  <div class="script-list">
    <div class="list-header">
      <label class="control-label">提词文案列表</label>
      <button v-if="isMaster" class="btn-add-script" @click="$emit('add')">+ 添加文案</button>
    </div>

    <div class="list-body" @click="menuOpenId = null">
      <div v-if="scripts.length === 0" class="empty-hint">
        {{ isMaster ? '点击上方按钮添加第一条提词文案' : '等待主控端添加文案...' }}
      </div>

      <div
        v-for="script in scripts"
        :key="script.id"
        class="script-card"
        :class="{ active: script.id === activeScriptId }"
      >
        <div class="card-header">
          <span class="card-title">{{ script.title || '未命名文案' }}</span>
          <span v-if="isMaster" class="card-menu-btn" @click.stop="toggleMenu(script.id)">⋮</span>
        </div>
        <div class="card-preview">{{ script.text }}</div>
        <div class="card-footer">
          <button class="btn-start-script" @click.stop="$emit('start', script.id)">
            <svg viewBox="0 0 24 24" class="btn-icon"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
            立即提词
          </button>
        </div>

        <div v-if="menuOpenId === script.id" class="card-menu">
          <button @click.stop="onEdit(script.id)">✏️ 编辑</button>
          <button @click.stop="onDelete(script.id)">🗑 删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  scripts: { type: Array, default: () => [] },
  activeScriptId: { type: String, default: null },
  isMaster: { type: Boolean, default: true }
})

const emit = defineEmits(['add', 'edit', 'delete', 'start'])

const menuOpenId = ref(null)

function toggleMenu(id) {
  menuOpenId.value = menuOpenId.value === id ? null : id
}

function onEdit(id) {
  menuOpenId.value = null
  emit('edit', id)
}

function onDelete(id) {
  menuOpenId.value = null
  emit('delete', id)
}
</script>

<style scoped>
.script-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-add-script {
  padding: 6px 14px;
  background: rgba(74, 158, 255, 0.12);
  border: 1px solid rgba(74, 158, 255, 0.3);
  border-radius: 8px;
  color: #4a9eff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-script:hover {
  background: rgba(74, 158, 255, 0.2);
}

.list-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-hint {
  padding: 20px;
  text-align: center;
  color: #555;
  font-size: 13px;
}

.script-card {
  position: relative;
  padding: 14px;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 10px;
  cursor: default;
  transition: border-color 0.2s;
}

.script-card.active {
  border-color: #4a9eff;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}

.card-menu-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  user-select: none;
}

.card-menu-btn:hover {
  background: #333;
  color: #ccc;
}

.card-preview {
  font-size: 12px;
  color: #777;
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 10px;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
}

.btn-start-script {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #4a9eff;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-start-script:hover {
  background: #3a8eef;
}

.btn-start-script .btn-icon {
  width: 16px;
  height: 16px;
}

.card-menu {
  position: absolute;
  top: 40px;
  right: 14px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 4px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.card-menu button {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #ccc;
  font-size: 13px;
  text-align: left;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.card-menu button:hover {
  background: #3a3a3a;
}
</style>
