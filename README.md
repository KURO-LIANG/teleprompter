# Teleprompter - Web 提词器

基于 Vue 3 的 Web 提词器，支持局域网多设备同步、语音识别跟随高亮、响应式多端适配。

## 功能

- **提词滚动** — 输入文本、调节字号（16–200px）和滚动速度（1–20），自动平滑滚动
- **局域网同步** — 电脑端作为主控编辑文本，手机/iPad 作为从显端自动同步
- **语音识别跟随** — 朗读时实时识别，已读文字变色，当前字高亮（需 Chrome/Edge）
- **多端响应式** — 桌面端左右分栏、平板端上下分栏、手机端全屏控制面板
- **手机横屏** — 手机开始提词后自动请求全屏 + 横屏锁定
- **5 秒倒计时** — 开始提词前倒计时 5→1，防止措手不及
- **镜像模式** — CSS 水平翻转，适配提词器反射镜
- **绿色字体** — 高对比度绿色文字模式
- **三种高亮样式** — 绿灯模式 / 渐隐模式 / 暗化模式，控制面板随时切换

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 (Composition API) + Vite 5 |
| 同步 | WebSocket（ws 库） |
| 语音 | Web Speech API（SpeechRecognition） |
| 样式 | CSS3 响应式布局 + CSS 动画 |

## 项目结构

```
teleprompter/
├── index.html
├── package.json
├── vite.config.js
├── server.js                           # Node.js WebSocket + 静态服务器
├── src/
│   ├── main.js
│   ├── App.vue                         # 根组件：双模式切换 + 状态管理
│   ├── components/
│   │   ├── ControlPanel.vue            # 控制台：文本/字号/速度/样式设置
│   │   └── TeleprompterDisplay.vue     # 提词显示：滚动 + 倒计时 + 语音高亮
│   └── composables/
│       ├── useWebSocket.js             # WebSocket 连接管理（自动重连 + 主从角色）
│       └── useSpeechRecognition.js     # 语音识别封装（中文 + 连续监听）
```

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（Vite 热更新 + WebSocket 并行）
npm run dev

# 生产模式
npm run build
node server.js
```

服务器启动后输出：

```
  Teleprompter Server

  Local:   http://localhost:3000
  Network: http://192.168.1.x:3000

  Open the Network URL on your iPad/mobile to connect.
```

## 局域网使用

1. 电脑运行 `npm run build && node server.js`
2. 电脑浏览器打开 `http://localhost:3000` → 自动成为**主控端**
3. 手机/iPad 浏览器打开 `http://<电脑IP>:3000` → 自动成为**从显端**
4. 主控端输入文本、调节参数 → 从显端自动同步
5. 主控端点击"开始提词" → 所有设备同步进入提词模式

> 确保手机和电脑在同一 Wi-Fi 网络下。如连接失败，检查电脑防火墙是否允许 Node 进程的 3000 端口。

## 语音识别

1. 点击"开始提词" → 浏览器弹出麦克风权限授权
2. 倒计时结束后开始滚动 + 语音识别
3. 朗读文字 → 已读字变色，当前字高亮

在控制面板中可选择三种高亮样式：

| 样式 | 已读 | 当前 | 未读 |
|------|------|------|------|
| 绿灯模式 | `#4ade80` 绿 | 白色粗体 + 蓝线 | 白色 |
| 渐隐模式 | 半透明 | 白色粗体 | 白色 |
| 暗化模式 | `#555` 暗灰 | 白色粗体 | 白色 |

> **兼容性**：语音识别仅 Chrome/Edge 支持，Firefox/Safari 不支持。不支持时，高亮样式选择器不显示。

## 开发

```bash
# 启动开发服务器（Vite 5173 + WebSocket 3000）
npm run dev

# 构建
npm run build

# 启动生产服务器
node server.js
```

开发模式下 Vite 在 `localhost:5173` 提供前端，WebSocket 服务器在 `localhost:3000`。手机端访问开发模式需用 `http://<电脑IP>:5173`，WebSocket 会自动连接到电脑的 3000 端口。

## License

MIT
