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

let masterClient = null
const clients = new Set()

function getLocalIP() {
  const interfaces = Object.values(os.networkInterfaces()).flat()
  const ip = interfaces.find(
    (iface) => iface.family === 'IPv4' && !iface.internal
  )
  return ip ? ip.address : 'localhost'
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
  let filePath = path.join(DIST_DIR, req.url === '/' ? '/index.html' : req.url)
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

function broadcast(msg, exclude) {
  const data = JSON.stringify(msg)
  for (const client of clients) {
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

wss.on('connection', (ws) => {
  clients.add(ws)

  const isFirstClient = clients.size === 1 && !masterClient
  if (isFirstClient) {
    masterClient = ws
    sendTo(ws, { type: 'role', role: 'master' })
  } else {
    sendTo(ws, { type: 'role', role: 'slave' })
    if (masterClient && masterClient.readyState === 1) {
      sendTo(masterClient, {
        type: 'syncRequest',
        message: 'New slave connected, please sync state'
      })
    }
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      switch (msg.type) {
        case 'claimMaster':
          if (!masterClient || masterClient.readyState !== 1) {
            masterClient = ws
            sendTo(ws, { type: 'role', role: 'master' })
            broadcast({ type: 'masterChanged' }, ws)
          } else {
            sendTo(ws, { type: 'role', role: 'slave' })
          }
          break

        case 'sync':
          if (ws === masterClient) {
            broadcast({ type: 'sync', data: msg.data }, ws)
          }
          break

        case 'play':
          if (ws === masterClient) {
            broadcast({ type: 'play', isPlaying: msg.isPlaying }, ws)
          }
          break

        case 'requestState':
          if (masterClient && masterClient.readyState === 1) {
            sendTo(masterClient, {
              type: 'syncRequest',
              message: 'New client requesting state'
            })
          }
          break
      }
    } catch (e) {
      // ignore invalid messages
    }
  })

  ws.on('close', () => {
    clients.delete(ws)
    if (ws === masterClient) {
      masterClient = null
      broadcast({ type: 'masterDisconnected' })
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
