import { ref, computed, onMounted, onUnmounted } from 'vue'

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function getRoomCode() {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search)
  let code = params.get('room')
  if (!code) {
    code = generateRoomCode()
    params.set('room', code)
    const url = new URL(window.location.href)
    url.search = params.toString()
    history.replaceState(null, '', url.toString())
  }
  return code
}

export function useWebSocket() {
  const isConnected = ref(false)
  const role = ref('')
  const roomCode = ref('')
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

  const slaveUrl = computed(() => {
    if (!roomCode.value) return ''
    if (role.value !== 'master') return ''
    const url = new URL(window.location.href)
    url.searchParams.set('room', roomCode.value)
    return url.toString()
  })

  function getWsUrl() {
    const host = window.location.hostname
    const isLocal = host === 'localhost' || host === '127.0.0.1'
    const base = isLocal
      ? 'ws://localhost:3000'
      : (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host
    const device = window.innerWidth < 768 ? 'mobile' : 'desktop'
    return `${base}?room=${roomCode.value}&device=${device}`
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
    roomCode.value = getRoomCode()
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    role,
    roomCode,
    slaveUrl,
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
