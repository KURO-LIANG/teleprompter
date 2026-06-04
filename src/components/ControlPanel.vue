<template>
  <div class="control-panel">
    <div class="panel-header">
      <h2 class="panel-title">提词器控制台</h2>
      <div class="connection-status">
        <span class="status-dot" :class="{ connected: isConnected }"></span>
        <span class="status-text">
          {{ isConnected ? (isMaster ? '主控端' : '从显端') : '未连接' }}
        </span>
      </div>
    </div>

    <div class="panel-body">
      <ScriptList
        :scripts="scripts"
        :activeScriptId="activeScriptId"
        :isMaster="isMaster"
        @add="$emit('addScript')"
        @edit="$emit('editScript', $event)"
        @delete="$emit('deleteScript', $event)"
        @start="$emit('startScript', $event)"
      />

      <ScriptModal
        :visible="modalVisible"
        :script="editingScript"
        @save="$emit('saveScript', $event)"
        @close="$emit('closeModal')"
      />

      <div class="control-group">
        <div class="label-row">
          <label class="control-label">字号</label>
          <span class="control-value">{{ fontSize }}px</span>
        </div>
        <input
          type="range"
          class="slider"
          :value="fontSize"
          min="16"
          max="200"
          step="2"
          @input="$emit('update:fontSize', Number($event.target.value))"
        />
      </div>

      <div class="control-group">
        <div class="label-row">
          <label class="control-label">滚动速度</label>
          <span class="control-value">{{ speed }}</span>
        </div>
        <input
          type="range"
          class="slider"
          :value="speed"
          min="1"
          max="20"
          step="1"
          @input="$emit('update:speed', Number($event.target.value))"
        />
      </div>

      <div class="control-group toggles">
        <label class="toggle-item">
          <input type="checkbox" :checked="isMirrored" @change="$emit('update:isMirrored', $event.target.checked)" />
          <span>镜像模式</span>
        </label>
        <label class="toggle-item">
          <input type="checkbox" :checked="greenText" @change="$emit('update:greenText', $event.target.checked)" />
          <span>绿色字体</span>
        </label>
      </div>

      <div class="control-group">
        <label class="control-label">高亮样式</label>
        <div class="style-selector">
          <label class="style-option" :class="{ active: highlightStyle === 'green' }">
            <input type="radio" value="green" :checked="highlightStyle === 'green'" @change="$emit('update:highlightStyle', 'green')" />
            <span>绿灯模式</span>
          </label>
          <label class="style-option" :class="{ active: highlightStyle === 'fade' }">
            <input type="radio" value="fade" :checked="highlightStyle === 'fade'" @change="$emit('update:highlightStyle', 'fade')" />
            <span>渐隐模式</span>
          </label>
          <label class="style-option" :class="{ active: highlightStyle === 'dim' }">
            <input type="radio" value="dim" :checked="highlightStyle === 'dim'" @change="$emit('update:highlightStyle', 'dim')" />
            <span>暗化模式</span>
          </label>
          <label class="style-option" :class="{ active: highlightStyle === 'none' }">
            <input type="radio" value="none" :checked="highlightStyle === 'none'" @change="$emit('update:highlightStyle', 'none')" />
            <span>无</span>
          </label>
        </div>
      </div>

      <div v-if="isConnected && isMaster && slaveUrl" class="room-info">
        <label class="control-label">房间码</label>
        <div class="room-code">{{ roomCode }}</div>
        <label class="control-label" style="margin-top:6px">从显端访问地址</label>
        <div class="room-url">{{ slaveUrl }}</div>
      </div>

      <div v-if="isConnected && !isMaster" class="claim-section">
        <button class="btn btn-claim" @click="$emit('requestSync')">
          请求同步
        </button>
        <button class="btn btn-claim" style="margin-top:8px" @click="$emit('claim')">
          接管控制权
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import ScriptList from './ScriptList.vue'
import ScriptModal from './ScriptModal.vue'

defineProps({
  text: { type: String, default: '' },
  fontSize: { type: Number, default: 64 },
  speed: { type: Number, default: 5 },
  isMirrored: { type: Boolean, default: false },
  greenText: { type: Boolean, default: false },
  isConnected: { type: Boolean, default: false },
  isMaster: { type: Boolean, default: true },
  roomCode: { type: String, default: '' },
  slaveUrl: { type: String, default: '' },
  scripts: { type: Array, default: () => [] },
  activeScriptId: { type: String, default: null },
  modalVisible: { type: Boolean, default: false },
  editingScript: { type: Object, default: null }
})

defineEmits(['update:text', 'update:fontSize', 'update:speed', 'update:isMirrored', 'update:greenText', 'start', 'claim', 'requestSync', 'update:highlightStyle', 'addScript', 'editScript', 'deleteScript', 'startScript', 'saveScript', 'closeModal'])
</script>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #141414;
  color: #e0e0e0;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #2a2a2a;
  flex-shrink: 0;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #f0f0f0;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #888;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #555;
  flex-shrink: 0;
}

.status-dot.connected {
  background: #4ade80;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.5);
}

.panel-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  overflow-y: auto;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  font-weight: 500;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-value {
  font-size: 13px;
  color: #4a9eff;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.text-input {
  width: 100%;
  padding: 12px;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.2s;
}

.text-input:focus {
  outline: none;
  border-color: #4a9eff;
}

.text-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.text-input::placeholder {
  color: #555;
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: #2a2a2a;
  border-radius: 3px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4a9eff;
  cursor: pointer;
  border: 2px solid #141414;
  box-shadow: 0 0 8px rgba(74, 158, 255, 0.3);
}

.toggles {
  flex-direction: row;
  gap: 20px;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
  color: #ccc;
}

.toggle-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #4a9eff;
  cursor: pointer;
}

.control-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.btn {
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-start {
  background: #4a9eff;
  color: #fff;
}

.btn-start:hover {
  background: #3a8eef;
  box-shadow: 0 4px 16px rgba(74, 158, 255, 0.3);
}

.btn-start:active {
  transform: scale(0.98);
}

.claim-section {
  padding-top: 12px;
  border-top: 1px solid #2a2a2a;
}

.btn-claim {
  background: transparent;
  color: #4a9eff;
  border: 1px solid #4a9eff;
}

.btn-claim:hover {
  background: rgba(74, 158, 255, 0.1);
}

.room-info {
  padding: 12px 14px;
  background: rgba(74, 158, 255, 0.06);
  border: 1px solid rgba(74, 158, 255, 0.2);
  border-radius: 8px;
  margin-bottom: 4px;
}

.room-code {
  font-size: 20px;
  font-weight: 700;
  color: #4a9eff;
  letter-spacing: 0.1em;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
}

.room-url {
  font-size: 12px;
  color: #999;
  word-break: break-all;
  margin-top: 4px;
}

.style-selector {
  display: flex;
  gap: 6px;
}

.style-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 6px;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  font-size: 12px;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}

.style-option.active {
  border-color: #4a9eff;
  color: #4a9eff;
  background: rgba(74, 158, 255, 0.08);
}

.style-option input[type="radio"] {
  display: none;
}

.mic-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.mic-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #555;
  flex-shrink: 0;
}

.mic-dot.active {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
  animation: mic-pulse 1.5s infinite;
}

.mic-text {
  font-size: 12px;
  color: #888;
}

@keyframes mic-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.speech-error {
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #f87171;
  font-size: 13px;
  line-height: 1.4;
}
</style>
