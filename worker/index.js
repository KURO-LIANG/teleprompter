export class TeleprompterRoom {
  constructor(ctx, env) {
    this.ctx = ctx
    this.sessions = new Map()
    this.masterId = null
    this.nextId = 0
  }

  async fetch(request) {
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

    client.send(JSON.stringify({ type: 'role', role: session.role }))

    if (!isFirst) {
      for (const [ws, s] of this.sessions) {
        if (s.role === 'master') {
          try {
            s.client.send(JSON.stringify({ type: 'syncRequest' }))
          } catch (e) {}
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
            sender.client.send(JSON.stringify({ type: 'role', role: 'master' }))
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
                s.client.send(JSON.stringify({ type: 'syncRequest' }))
              } catch (e) {}
            }
          }
          break
      }
    } catch (e) {}
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
        try { s.client.send(data) } catch (e) {}
      }
    }
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
