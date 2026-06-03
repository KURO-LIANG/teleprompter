import { ref } from 'vue'

export function useSpeechRecognition(lang = 'zh-CN') {
  const isSupported = ref(false)
  const isListening = ref(false)
  const lastResult = ref('')
  const interimResult = ref('')
  const errorMessage = ref('')
  const lastError = ref('')
  const errorCount = ref(0)
  const audioDetected = ref(false)

  let recognition = null
  let autoRestart = true
  let restartTimer = null
  let cumulative = ''
  let consecutiveNoSpeech = 0

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

  if (SpeechRecognition) {
    isSupported.value = true
  }

  function createRecognition() {
    if (!SpeechRecognition) return null

    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = lang

    rec.onresult = (event) => {
      consecutiveNoSpeech = 0
      errorMessage.value = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          cumulative += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      console.log('[Speech] result:', cumulative, 'interim:', interim)
      lastResult.value = cumulative
      interimResult.value = interim
    }

    rec.onaudiostart = () => {
      console.log('[Speech] audio detected')
      audioDetected.value = true
    }

    rec.onsoundstart = () => {
      console.log('[Speech] sound detected')
    }

    rec.onspeechstart = () => {
      console.log('[Speech] speech start detected')
    }

    rec.onerror = (event) => {
      lastError.value = event.error
      errorCount.value++
      console.error('[Speech] Error:', event.error)

      if (event.error === 'not-allowed') {
        errorMessage.value = '麦克风权限被拒绝，请在浏览器设置中允许'
        autoRestart = false
      } else if (event.error === 'no-speech') {
        consecutiveNoSpeech++
        if (consecutiveNoSpeech >= 3) {
          autoRestart = false
          errorMessage.value = '语音识别服务无法访问（可能网络限制）。建议：1) 使用 VPN  2) 切换 Edge 浏览器  3) 用本地服务器访问'
        }
      } else if (event.error === 'aborted') {
        // intentional stop
      } else if (event.error === 'network') {
        autoRestart = false
        errorMessage.value = '语音识别网络错误，Google 语音服务可能被屏蔽。建议使用 VPN 或 Edge 浏览器'
      } else {
        errorMessage.value = `语音识别错误: ${event.error}`
      }
    }

    rec.onend = () => {
      isListening.value = false
      if (autoRestart) {
        const delay = consecutiveNoSpeech > 0 ? 2000 : 200
        clearTimeout(restartTimer)
        restartTimer = setTimeout(() => {
          try {
            rec.start()
            isListening.value = true
          } catch (e) {
            // ignore
          }
        }, delay)
      }
    }

    return rec
  }

  function start() {
    clearTimeout(restartTimer)
    restartTimer = null

    if (!SpeechRecognition) {
      errorMessage.value = '浏览器不支持语音识别（请使用 Chrome 或 Edge）'
      return
    }

    autoRestart = true
    cumulative = ''
    consecutiveNoSpeech = 0
    audioDetected.value = false
    lastResult.value = ''
    interimResult.value = ''
    errorMessage.value = ''
    lastError.value = ''
    errorCount.value = 0

    recognition = createRecognition()
    if (recognition) {
      try {
        recognition.start()
        isListening.value = true
      } catch (e) {
        errorMessage.value = '启动语音识别失败'
      }
    }
  }

  function stop() {
    clearTimeout(restartTimer)
    restartTimer = null
    autoRestart = false
    if (recognition) {
      try {
        recognition.stop()
      } catch (e) {
        // ignore
      }
      recognition = null
    }
    isListening.value = false
  }

  return {
    isSupported,
    isListening,
    lastResult,
    interimResult,
    errorMessage,
    lastError,
    errorCount,
    audioDetected,
    start,
    stop
  }
}
