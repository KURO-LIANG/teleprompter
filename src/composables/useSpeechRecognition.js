import { ref } from 'vue'

export function useSpeechRecognition(lang = 'zh-CN') {
  const isSupported = ref(false)
  const isListening = ref(false)
  const lastResult = ref('')
  const interimResult = ref('')
  const errorMessage = ref('')

  let recognition = null
  let autoRestart = true
  let cumulative = ''

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
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          cumulative += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      lastResult.value = cumulative
      interimResult.value = interim
    }

    rec.onerror = (event) => {
      if (event.error === 'not-allowed') {
        errorMessage.value = '麦克风权限被拒绝'
        autoRestart = false
      } else if (event.error === 'no-speech') {
        // silence - normal, don't show error
      } else if (event.error === 'aborted') {
        // intentional stop
      } else {
        errorMessage.value = `语音识别错误: ${event.error}`
      }
    }

    rec.onend = () => {
      isListening.value = false
      if (autoRestart) {
        try {
          rec.start()
          isListening.value = true
        } catch (e) {
          // ignore restart errors
        }
      }
    }

    return rec
  }

  function start() {
    if (!SpeechRecognition) {
      errorMessage.value = '浏览器不支持语音识别（请使用 Chrome 或 Edge）'
      return
    }

    autoRestart = true
    cumulative = ''
    lastResult.value = ''
    interimResult.value = ''
    errorMessage.value = ''

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
    start,
    stop
  }
}
