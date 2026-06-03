<template>
  <div class="app-root" :class="{ 'mode-prompting': mode === 'prompting' }">
    <div v-show="mode === 'edit' || isDesktop" class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <button class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
        {{ sidebarCollapsed ? '☰' : '✕' }}
      </button>
      <ControlPanel
        v-show="!sidebarCollapsed"
        :text="text"
        :fontSize="fontSize"
        :speed="speed"
        :isMirrored="isMirrored"
        :greenText="greenText"
        :isConnected="ws.isConnected.value"
        :isMaster="ws.role.value === 'master'"
        :highlightStyle="highlightStyle"
        @update:text="onTextChange"
        @update:fontSize="fontSize = $event"
        @update:speed="speed = $event"
        @update:isMirrored="isMirrored = $event"
        @update:greenText="greenText = $event"
        @start="startPrompting"
        @claim="ws.claimMaster()"
        @requestSync="ws.requestState()"
        @update:highlightStyle="highlightStyle = $event"
      />
    </div>

    <div class="main-area">
      <TeleprompterDisplay
        ref="displayRef"
        :text="text"
        :fontSize="fontSize"
        :speed="speed"
        :isPlaying="isPlaying"
        :isMirrored="isMirrored"
        :greenText="greenText"
        :countdown="countdown"
        :tokens="tokens"
        :highlightStyle="highlightStyle"
      />

      <div v-if="mode === 'prompting'" class="floating-controls">
        <button class="float-btn" @click.stop="togglePlay" :title="isPlaying ? '暂停' : '播放'">
          <svg v-if="isPlaying" viewBox="0 0 24 24" class="btn-icon"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/></svg>
          <svg v-else viewBox="0 0 24 24" class="btn-icon"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
        </button>
        <button class="float-btn" @click.stop="stopPrompting" title="停止">
          <svg viewBox="0 0 24 24" class="btn-icon"><path d="M6 6h12v12H6z" fill="currentColor"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import ControlPanel from './components/ControlPanel.vue'
import TeleprompterDisplay from './components/TeleprompterDisplay.vue'
import { useWebSocket } from './composables/useWebSocket.js'

const text = ref('')
const fontSize = ref(64)
const speed = ref(5)
const isPlaying = ref(false)
const isMirrored = ref(false)
const greenText = ref(false)
const mode = ref('edit')
const sidebarCollapsed = ref(false)
const countdown = ref(0)
const highlightStyle = ref('green')
const displayRef = ref(null)
let textSyncTimer = null
let countdownTimer = null

const ws = useWebSocket()

ws.onSync((data) => {
  if (ws.role.value !== 'master') {
    text.value = data.text || ''
    fontSize.value = data.fontSize || 64
    speed.value = data.speed || 5
    isMirrored.value = data.isMirrored || false
    greenText.value = data.greenText || false
    if (data.isPlaying !== undefined) {
      isPlaying.value = data.isPlaying
    }
  }
})

ws.onPlay((playing) => {
  if (ws.role.value !== 'master') {
    isPlaying.value = playing
  }
})

ws.onDisconnected(() => {
  isPlaying.value = false
})

ws.onSyncRequest(() => {
  if (ws.role.value === 'master') {
    syncState()
  }
})

function syncState() {
  if (ws.role.value === 'master' && ws.isConnected.value) {
    ws.sendSync({
      text: text.value,
      fontSize: fontSize.value,
      speed: speed.value,
      isPlaying: isPlaying.value,
      isMirrored: isMirrored.value,
      greenText: greenText.value
    })
  }
}

function tokenizeText(value) {
  const tokens = []
  let i = 0
  while (i < value.length) {
    const ch = value[i]
    if (ch === '\n') {
      tokens.push({ text: '\n', clean: '', br: true })
      i++
    } else if (/[\u4e00-\u9fff]/.test(ch)) {
      tokens.push({ text: ch, clean: ch, br: false })
      i++
    } else if (/\s/.test(ch)) {
      let ws = ''
      while (i < value.length && /\s/.test(value[i]) && value[i] !== '\n') {
        ws += value[i]
        i++
      }
      tokens.push({ text: ws, clean: '', br: false })
    } else {
      let word = ''
      while (i < value.length && !/\s/.test(value[i]) && !/[\u4e00-\u9fff]/.test(value[i])) {
        word += value[i]
        i++
      }
      if (!word) { word = value[i]; i++ }
      const clean = word.replace(/[^\w\u4e00-\u9fff]/g, '').toLowerCase()
      tokens.push({ text: word, clean, br: false })
    }
  }
  return tokens
}

const tokens = computed(() => tokenizeText(text.value))

function onTextChange(val) {
  text.value = val
  clearTimeout(textSyncTimer)
  textSyncTimer = setTimeout(() => {
    if (ws.role.value === 'master') syncState()
  }, 150)
}

watch([fontSize, speed, isMirrored, greenText], () => {
  if (ws.role.value === 'master') syncState()
})

watch(isPlaying, (val) => {
  if (ws.role.value === 'master' && ws.isConnected.value) {
    ws.sendPlay(val)
  }
})

async function startPrompting() {
  mode.value = 'prompting'
  sidebarCollapsed.value = true
  isPlaying.value = false

  nextTick(() => {
    displayRef.value?.resetScroll()
  })

  if (window.innerWidth < 768) {
    await enterFullscreen().catch(() => {})
    lockLandscape()
  }

  countdown.value = 3
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
      isPlaying.value = true
    }
  }, 1000)
}

function stopPrompting() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  countdown.value = 0
  isPlaying.value = false
  exitFullscreen()
  mode.value = 'edit'
  sidebarCollapsed.value = false
}

function enterFullscreen() {
  const el = document.documentElement
  if (el.requestFullscreen) return el.requestFullscreen()
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen()
  return Promise.resolve()
}

function lockLandscape() {
  try {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {})
    }
  } catch (e) {}
}

function exitFullscreen() {
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen()
    }
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock()
    }
  } catch (e) {}
}

function togglePlay() {
  isPlaying.value = !isPlaying.value
}

const isDesktop = computed(() => window.innerWidth >= 1024)
</script>

<style>
:root {
  --bg-primary: #0a0a0a;
  --bg-sidebar: #141414;
  --text-primary: #e8e8e8;
  --accent: #4a9eff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>

<style scoped>
.app-root {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.sidebar {
  width: 380px;
  height: 100%;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: 44px;
}

.sidebar-toggle {
  display: none;
  position: absolute;
  top: 12px;
  right: 8px;
  z-index: 20;
  width: 32px;
  height: 32px;
  border: none;
  background: #2a2a2a;
  color: #ccc;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.main-area {
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
  min-width: 0;
}

.floating-controls {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 50;
  pointer-events: auto;
}

.float-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.float-btn:active {
  background: rgba(74, 158, 255, 0.3);
}

.btn-icon {
  width: 22px;
  height: 22px;
}

/* Tablet: 768-1023px */
@media (max-width: 1023px) {
  .app-root {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    height: auto;
    max-height: 50vh;
    flex-shrink: 0;
  }

  .sidebar.collapsed {
    height: 48px;
    max-height: 48px;
  }

  .sidebar-toggle {
    display: block;
  }

  .main-area {
    flex: 1;
  }
}

/* Mobile: < 768px */
@media (max-width: 767px) {
  .app-root.mode-prompting .sidebar {
    display: none;
  }

  .sidebar {
    max-height: 55vh;
  }

  .app-root:not(.mode-prompting) .main-area {
    display: none;
  }

  .app-root:not(.mode-prompting) .sidebar {
    max-height: 100vh;
  }
}
</style>
