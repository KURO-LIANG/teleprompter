import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.argv.includes('--dev')
const PORT = 3000
const DIST_DIR = path.join(__dirname, 'dist')

const rooms = new Map()

function getLocalIP() {
  const interfaces = Object.values(os.networkInterfaces()).flat()
  const ip = interfaces.find(
    (iface) => iface.family === 'IPv4' && !iface.internal
  )
  return ip ? ip.address : 'localhost'
}

function getOrCreateRoom(code) {
  let room = rooms.get(code)
  if (!room) {
    room = {
      code,
      master: null,
      clients: new Set()
    }
    rooms.set(code, room)
  }
  return room
}

function roomBroadcast(room, msg, exclude) {
  const data = JSON.stringify(msg)
  for (const client of room.clients) {
    if (client !== exclude && client.readyState === 1) {
      client.send(data)
    }
  }
}

function sendTo(client, msg) {
  if (client && client.readyState === 1) {
    client.send(JSON.stringify(msg))
  }
}

function parseRoomCode(req) {
  try {
    const url = new URL(req.url, 'http://localhost')
    return url.searchParams.get('room') || 'default'
  } catch {
    return 'default'
  }
}

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
}

function serveStatic(req, res) {
  const parsed = new URL(req.url, 'http://localhost')
  let filePath = path.join(DIST_DIR, parsed.pathname === '/' ? '/index.html' : parsed.pathname)
  const ext = path.extname(filePath)

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    fs.createReadStream(filePath).pipe(res)
    return true
  }
  filePath = path.join(DIST_DIR, 'index.html')
  if (fs.existsSync(filePath)) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    fs.createReadStream(filePath).pipe(res)
    return true
  }
  return false
}

const server = http.createServer((req, res) => {
  if (isDev) {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Dev mode - WebSocket only')
    return
  }
  if (!serveStatic(req, res)) {
    res.writeHead(404)
    res.end('Not Found')
  }
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const roomCode = parseRoomCode(req)
  const room = getOrCreateRoom(roomCode)

  room.clients.add(ws)

  const isFirstClient = room.clients.size === 1 && !room.master
  if (isFirstClient) {
    room.master = ws
    sendTo(ws, { type: 'role', role: 'master' })
  } else {
    sendTo(ws, { type: 'role', role: 'slave' })
    if (room.master && room.master.readyState === 1) {
      sendTo(room.master, { type: 'syncRequest', message: 'New slave connected' })
    }
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      switch (msg.type) {
        case 'claimMaster':
          if (!room.master || room.master.readyState !== 1) {
            room.master = ws
            sendTo(ws, { type: 'role', role: 'master' })
            roomBroadcast(room, { type: 'masterChanged' }, ws)
          } else {
            sendTo(ws, { type: 'role', role: 'slave' })
          }
          break

        case 'sync':
          if (ws === room.master) {
            roomBroadcast(room, { type: 'sync', data: msg.data }, ws)
          }
          break

        case 'play':
          if (ws === room.master) {
            roomBroadcast(room, { type: 'play', isPlaying: msg.isPlaying }, ws)
          }
          break

        case 'requestState':
          if (room.master && room.master.readyState === 1) {
            sendTo(room.master, {
              type: 'syncRequest',
              message: 'Client requesting state'
            })
          }
          break
      }
    } catch (e) {
      // ignore invalid messages
    }
  })

  ws.on('close', () => {
    room.clients.delete(ws)
    if (ws === room.master) {
      room.master = null
      roomBroadcast(room, { type: 'masterDisconnected' })
    }
    if (room.clients.size === 0) {
      rooms.delete(roomCode)
    }
  })
})

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP()
  console.log(`\n  Teleprompter Server\n`)
  console.log(`  Local:   http://localhost:${PORT}`)
  console.log(`  Network: http://${ip}:${PORT}`)
  console.log(`\n  Open the Network URL on your iPad/mobile to connect.\n`)
})
