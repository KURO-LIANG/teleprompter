# Teleprompter - Web 提词器

基于 Vue 3 的 Web 提词器，支持滚动同步高亮、多端响应式、局域网多设备同步。

## 功能

### 核心

| 功能 | 说明 |
|------|------|
| 提词滚动 | 输入文本，调节字号（16–200px）和滚动速度（1–20），自动平滑滚动 |
| 滚动同步高亮 | 文字滚动到哪里就自动高亮到哪里，已读变色、当前字高亮 |
| 手动调速 | 鼠标拖拽或触屏滑动文字实时调速，松手后自动滚动从新位置继续 |
| 3 秒倒计时 | 开始提词前 3→2→1 大字号倒计时（60vh），防止措手不及 |

### 显示

| 功能 | 说明 |
|------|------|
| 镜像模式 | CSS `scaleX(-1)` 水平翻转，适配提词器反射镜 |
| 绿色字体 | 高对比度绿色文字，更适合提词显示 |
| 高亮样式 | 4 选 1：绿灯模式 / 渐隐模式 / 暗化模式 / 无 |

### 同步

| 功能 | 说明 |
|------|------|
| 局域网同步 | 电脑端主控编辑，手机/iPad 从显端自动同步文本、字号、速度、播放状态 |
| 主从角色 | 首连设备自动成为主控，后续设备自动成为从显；支持接管控制权 |

### 响应式

| 设备 | 布局 |
|------|------|
| 桌面（≥1024px） | 左侧控制面板 380px + 右侧全屏提词 |
| 平板（768–1023px） | 上下分栏，控制面板可折叠 |
| 手机（<768px） | 编辑时全屏控制面板，提词时全屏显示 + 底部控制按钮 |
| 手机横屏 | 开始提词自动请求全屏 + `screen.orientation.lock('landscape')` |

## 截图

<!-- TODO: 添加截图 -->
<!--
![编辑模式](docs/screenshot-edit.png)
![提词模式](docs/screenshot-prompting.png)
![高亮效果](docs/screenshot-highlight.png)
-->

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 (Composition API) + Vite 5 |
| 同步 | WebSocket（ws 库） |
| 部署 | Cloudflare Pages |

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
│   │   ├── ControlPanel.vue            # 控制面板：文本/字号/速度/样式
│   │   └── TeleprompterDisplay.vue     # 提词显示：滚动 + 高亮 + 倒计时
│   └── composables/
│       ├── useWebSocket.js             # WebSocket 连接管理 + 主从角色
│       └── useSpeechRecognition.js     # 语音识别封装（备用）
```

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（Vite 5173 + WebSocket 3000）
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

## 局域网多设备同步

1. 电脑运行 `npm run build && node server.js`
2. 电脑浏览器打开 `http://localhost:3000` → 自动成为**主控端**
3. 手机/iPad 打开 `http://<电脑IP>:3000` → 自动成为**从显端**
4. 主控端输入文本、调节参数 → 从显端自动同步
5. 主控端点击"开始提词" → 所有设备同步进入提词模式

> 需同一 Wi-Fi 网络。如连接失败，检查防火墙是否允许 Node 的 3000 端口。

## 部署

### Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist/ --project-name=teleprompter
```

### 线上地址

**https://teleprompter-145.pages.dev**

> Cloudflare Pages 为 HTTPS，无法连接本地 WebSocket 服务。如需局域网同步，需通过 `node server.js` 在局域网内直接访问。

## 操作说明

### 控制面板

| 控件 | 说明 |
|------|------|
| 文本框 | 输入或粘贴提词文本（主控端可编辑，从显端只读） |
| 字号滑块 | 16–200px，默认 64px |
| 速度滑块 | 1–20，控制滚动速度 |
| 镜像模式 | 开启后文字水平翻转 |
| 绿色字体 | 切换高对比度绿色 |
| 高亮样式 | 绿灯 / 渐隐 / 暗化 / 无 |
| 开始提词 | 进入提词模式 + 3 秒倒计时 |

### 提词模式

| 操作 | 行为 |
|------|------|
| 单击文字 | 无操作 |
| 三连击 | 打开/关闭调试面板 |
| 鼠标拖拽 | 手动调整滚动位置，松手后恢复自动滚动 |
| 触屏滑动 | 文字跟随手指，松手后恢复自动滚动 |
| 鼠标滚轮 | 调整位置，200ms 后恢复自动滚动 |
| ▶ 按钮 | 暂停 / 播放 |
| ■ 按钮 | 停止，返回编辑模式 |

## License

MIT
