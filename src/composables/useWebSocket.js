import { ref, onMounted, onUnmounted } from 'vue'

export function useWebSocket() {
  const isConnected = ref(false)
  const role = ref('')
  let ws = null
  let reconnectTimer = null
  let reconnectAttempts = 0

  const _callbacks = {
    sync: null,
    play: null,
    roleChange: null,
    masterDisconnected: null,
    syncRequest: null
  }

  function getWsUrl() {
    const host = window.location.hostname
    const isLocal = host === 'localhost' || host === '127.0.0.1'
    if (isLocal) {
      return 'ws://localhost:3000'
    }
    return 'wss://teleprompter-sync.kuro5149330.workers.dev/ws'
  }

  function connect() {
    const url = getWsUrl()

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    try {
      ws = new WebSocket(url)
    } catch (e) {
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      isConnected.value = true
      reconnectAttempts = 0
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        switch (msg.type) {
          case 'role':
            role.value = msg.role
            if (msg.role === 'slave') {
              send({ type: 'requestState' })
            }
            _callbacks.roleChange?.(msg.role)
            break
          case 'sync':
            _callbacks.sync?.(msg.data)
            break
          case 'play':
            _callbacks.play?.(msg.isPlaying)
            break
          case 'masterDisconnected':
            _callbacks.masterDisconnected?.()
            break
          case 'masterChanged':
            _callbacks.masterDisconnected?.()
            break
          case 'syncRequest':
            _callbacks.syncRequest?.()
            break
        }
      } catch (e) {
        // ignore invalid messages
      }
    }

    ws.onclose = () => {
      isConnected.value = false
      role.value = ''
      scheduleReconnect()
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer)
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
    reconnectAttempts++
    reconnectTimer = setTimeout(connect, delay)
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  function sendSync(data) {
    send({ type: 'sync', data })
  }

  function sendPlay(isPlaying) {
    send({ type: 'play', isPlaying })
  }

  function claimMaster() {
    send({ type: 'claimMaster' })
  }

  function requestState() {
    send({ type: 'requestState' })
  }

  function disconnect() {
    clearTimeout(reconnectTimer)
    if (ws) {
      ws.onclose = null
      ws.close()
    }
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    role,
    sendSync,
    sendPlay,
    claimMaster,
    requestState,
    onSync: (fn) => { _callbacks.sync = fn },
    onPlay: (fn) => { _callbacks.play = fn },
    onRoleChange: (fn) => { _callbacks.roleChange = fn },
    onDisconnected: (fn) => { _callbacks.masterDisconnected = fn },
    onSyncRequest: (fn) => { _callbacks.syncRequest = fn }
  }
}
