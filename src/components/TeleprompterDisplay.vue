<template>
  <div
    ref="containerRef"
    class="teleprompter-display"
    :class="{ mirrored: isMirrored, 'green-text': greenText }"
    :style="{ fontSize: fontSize + 'px' }"
    @click="onClick"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
    @wheel.passive="onWheel"
  >
    <div class="teleprompter-content">
      <div class="teleprompter-text">
        <template v-for="(token, i) in tokens" :key="i">
          <br v-if="token.br" />
          <span v-else :class="tokenClass(i)">{{ token.text }}</span>
        </template>
      </div>
    </div>
    <div v-if="!isPlaying && !countdownActive" class="play-overlay">
      <div class="play-icon">&#9654;</div>
      <div class="play-hint">单击暂停 · 滑动调速 · 三连击调试</div>
    </div>
    <div v-if="isPlaying" class="reading-line"></div>
    <div v-if="countdownActive" class="countdown-overlay">
      <div class="countdown-number" :key="countdown">{{ countdown }}</div>
    </div>
    <div v-if="debugVisible" class="debug-panel" @click.stop>
      <div class="debug-row">
        <span class="debug-label">滚动进度</span>
        <span class="debug-value">{{ scrollPercent }}%</span>
      </div>
      <div class="debug-row">
        <span class="debug-label">已读 / 总字</span>
        <span class="debug-value">{{ scrollReadIndex }} / {{ tokens.length }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  fontSize: { type: Number, default: 64 },
  speed: { type: Number, default: 5 },
  isPlaying: { type: Boolean, default: false },
  isMirrored: { type: Boolean, default: false },
  greenText: { type: Boolean, default: false },
  countdown: { type: Number, default: 0 },
  tokens: { type: Array, default: () => [] },
  readIndex: { type: Number, default: 0 },
  highlightStyle: { type: String, default: 'green' }
})

const emit = defineEmits([])

const containerRef = ref(null)
let animationId = null

const countdownActive = computed(() => props.countdown > 0)
const debugVisible = ref(false)
const scrollReadIndex = ref(0)
const scrollPercent = ref(0)
const isUserInteracting = ref(false)
let clickCount = 0
let clickTimer = null
let lastReadCheck = 0
let interactionTimer = null
let isDragging = false
let dragStartY = 0
let dragStartScroll = 0
let debugLogTimer = 0

function animate(timestamp) {
  if (!containerRef.value) {
    animationId = requestAnimationFrame(animate)
    return
  }

  if (props.isPlaying && !isUserInteracting.value) {
    containerRef.value.scrollTop += props.speed * 0.1
  }

  if (timestamp - debugLogTimer > 2000) {
    console.log('[animate] isPlaying:', props.isPlaying, 'scrollTop:', Math.round(containerRef.value.scrollTop), 'isUserInteracting:', isUserInteracting.value)
    debugLogTimer = timestamp
  }
}

function onPointerDown(e) {
  isUserInteracting.value = true
  if (e.pointerType === 'mouse' && containerRef.value) {
    dragStartY = e.clientY
    dragStartScroll = containerRef.value.scrollTop
    isDragging = true
    containerRef.value.setPointerCapture(e.pointerId)
  }
}

function onPointerMove(e) {
  if (!isDragging) return
  const delta = dragStartY - e.clientY
  containerRef.value.scrollTop = dragStartScroll + delta
}

function onPointerUp() {
  isUserInteracting.value = false
  isDragging = false
}

function onWheel() {
  isUserInteracting.value = true
  clearTimeout(interactionTimer)
  interactionTimer = setTimeout(() => {
    isUserInteracting.value = false
  }, 200)
}

function tokenClass(i) {
  if (props.highlightStyle === 'none') return ''
  const idx = effectiveReadIndex.value
  if (!idx) return 'word-unread'
  if (i < idx) return `word-read style-${props.highlightStyle}`
  if (i === idx) return 'word-current'
  return 'word-unread'
}

function updateScrollReadIndex() {
  if (!containerRef.value) return
  const el = containerRef.value
  const maxScroll = el.scrollHeight - el.clientHeight
  if (maxScroll <= 0) return
  const pct = Math.min(el.scrollTop / maxScroll, 1)
  scrollPercent.value = Math.round(pct * 100)
  scrollReadIndex.value = Math.floor(pct * props.tokens.length)
}

function startAnimation() {
  if (animationId) return
  animationId = requestAnimationFrame(animate)
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

function resetScroll() {
  if (containerRef.value) {
    containerRef.value.scrollTop = 0
    scrollReadIndex.value = 0
    scrollPercent.value = 0
  }
}

watch(() => props.text, () => {
  resetScroll()
})

watch(() => props.isPlaying, (playing) => {
  console.log('[Display] isPlaying changed to:', playing, 'animationId:', !!animationId)
  if (playing) {
    if (!animationId) {
      startAnimation()
      console.log('[Display] animation restarted')
    }
  }
})

onMounted(() => {
  startAnimation()
})

onUnmounted(() => {
  stopAnimation()
})

defineExpose({ resetScroll, scrollReadIndex })
</script>

<style scoped>
.teleprompter-display {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  color: #e8e8e8;
  overflow-y: scroll;
  scrollbar-width: none;
  -ms-overflow-style: none;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.teleprompter-display::-webkit-scrollbar {
  display: none;
}

.teleprompter-display.mirrored {
  transform: scaleX(-1);
}

.teleprompter-display.green-text {
  color: #00ff41;
}

.teleprompter-content {
  padding: 40vh 8% 60vh 8%;
  line-height: 1.4;
  min-height: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.teleprompter-text {
  max-width: 900px;
  margin: 0 auto;
  text-align: left;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.play-icon {
  font-size: 64px;
  opacity: 0.6;
}

.play-hint {
  margin-top: 16px;
  font-size: 14px;
  opacity: 0.5;
}

.reading-line {
  position: absolute;
  left: 8%;
  right: 8%;
  top: 33%;
  height: 2px;
  background: rgba(74, 158, 255, 0.3);
  pointer-events: none;
  box-shadow: 0 0 12px rgba(74, 158, 255, 0.15);
}

.countdown-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  z-index: 30;
  pointer-events: none;
}

.countdown-number {
  font-size: 60vh;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 40px rgba(255, 255, 255, 0.3);
  animation: countdown-pop 0.4s ease-out;
}

@keyframes countdown-pop {
  0% { transform: scale(1.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.word-read.style-green { color: #4ade80; }
.word-read.style-fade  { opacity: 0.35; }
.word-read.style-dim   { color: #555; }
.word-read.style-none  { color: inherit; }

.word-current {
  color: #fff;
  font-weight: 700;
  border-bottom: 2px solid #4a9eff;
  padding-bottom: 1px;
}

.word-unread { color: inherit; }

.teleprompter-display.green-text .word-unread { color: #00ff41; }
.teleprompter-display.green-text .word-read.style-green { color: #00cc33; }
.teleprompter-display.green-text .word-current {
  color: #fff;
  border-bottom-color: #fff;
}

.debug-panel {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(74, 158, 255, 0.3);
  border-radius: 10px;
  padding: 10px 14px;
  z-index: 50;
  font-size: 12px;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.debug-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.debug-label {
  color: #888;
}

.debug-value {
  color: #ccc;
  font-variant-numeric: tabular-nums;
}

.debug-value.active {
  color: #4ade80;
}

.debug-value.error {
  color: #f87171;
}

@media (max-width: 767px) {
  .teleprompter-content {
    padding: 40vh 5% 60vh 5%;
  }
}
</style>
