export class TeleprompterRoom {
  constructor(state, env) {
    this.sessions = new Map()
    this.masterId = null
    this.nextId = 0
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade')
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    const sessionId = String(++this.nextId)
    const isFirst = this.sessions.size === 0 && !this.masterId

    const session = {
      id: sessionId,
      role: isFirst ? 'master' : 'slave',
      client
    }

    if (isFirst) {
      this.masterId = sessionId
    }

    this.sessions.set(server, session)
    this.ctx.acceptWebSocket(server)

    // Send role assignment
    client.send(JSON.stringify({ type: 'role', role: session.role }))

    // If a new slave joined and there's a master, request state
    if (!isFirst) {
      for (const [ws, s] of this.sessions) {
        if (s.role === 'master') {
          try {
            s.client.send(JSON.stringify({
              type: 'syncRequest',
              message: 'New slave connected'
            }))
          } catch (e) { /* ignore */ }
        }
      }
    }

    return new Response(null, { status: 101, webSocket: client })
  }

  webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message)
      const sender = this.sessions.get(ws)
      if (!sender) return

      switch (data.type) {
        case 'claimMaster':
          if (!this.masterId) {
            this.masterId = sender.id
            sender.role = 'master'
            this.sendTo(sender.client, { type: 'role', role: 'master' })
            this.broadcast({ type: 'masterChanged' }, ws)
          }
          break

        case 'sync':
          if (sender.role === 'master') {
            this.broadcast({ type: 'sync', data: data.data }, ws)
          }
          break

        case 'play':
          if (sender.role === 'master') {
            this.broadcast({ type: 'play', isPlaying: data.isPlaying }, ws)
          }
          break

        case 'requestState':
          for (const [, s] of this.sessions) {
            if (s.role === 'master') {
              try {
                s.client.send(JSON.stringify({
                  type: 'syncRequest',
                  message: 'Requesting state'
                }))
              } catch (e) { /* ignore */ }
            }
          }
          break
      }
    } catch (e) { /* ignore invalid messages */ }
  }

  webSocketClose(ws) {
    const session = this.sessions.get(ws)
    if (session) {
      if (session.role === 'master') {
        this.masterId = null
        this.broadcast({ type: 'masterDisconnected' })
      }
      this.sessions.delete(ws)
    }
  }

  webSocketError(ws) {
    this.webSocketClose(ws)
  }

  broadcast(msg, exclude) {
    const data = JSON.stringify(msg)
    for (const [ws, s] of this.sessions) {
      if (ws !== exclude) {
        try {
          s.client.send(data)
        } catch (e) { /* ignore */ }
      }
    }
  }

  sendTo(client, msg) {
    try {
      client.send(JSON.stringify(msg))
    } catch (e) { /* ignore */ }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/ws') {
      const id = env.TELEPROMPTER_ROOM.idFromName('default')
      const stub = env.TELEPROMPTER_ROOM.get(id)
      return stub.fetch(request)
    }
    return new Response('OK', { status: 200 })
  }
}
