# n2n-go WebSocket Control Plane on Cloudflare Workers

基于 Cloudflare Workers + Durable Objects 实现的 n2n-go 控制面，替代传统的 Supernode 服务器。

## 架构特点

- **零运维**: 无需自建服务器，部署到 Cloudflare 即可
- **全球 Anycast**: 就近接入，延迟极低
- **社区隔离**: 每个社区一个 Durable Object 实例，天然隔离
- **自动持久化**: Alarm 定时保存 IPAM、Peer 状态到 DO Storage
- **P2P 就绪**: 内置 ICE Candidate 转发、TURN 凭证下发、VFuze 透传
- **生产级监控**: 内置 `/test` `/room` `/log` 端点、限流、心跳管理

## 快速开始

### 1. 安装依赖

```bash
cd n2ngo-ws-relay
npm install
```

### 2. 本地开发

```bash
# 需要先配置 wrangler.toml 中的 KV/D1 绑定 (或设置 LOCAL_DEPLOY=true)
npm run dev
```

本地测试地址: `http://localhost:8787/test`

### 3. 部署到 Cloudflare

```bash
# 1. 创建 KV 命名空间 (用于存储 SN 密钥)
wrangler kv:namespace create "SN_KEYS"
# 将输出的 id 填入 wrangler.toml

# 2. 创建 D1 数据库 (可选，用于审计日志)
wrangler d1 create n2n-audit
# 将输出的 id 填入 wrangler.toml

# 3. 部署
npm run deploy
```

### 4. 绑定自定义域名

在 Cloudflare Dashboard → Workers → 你的 Worker → Triggers → Custom Domains 添加域名。

## 客户端连接

n2n-go Edge 启动参数：

```bash
# 连接控制面
n2n-go up -c mycommunity -k mypassword \
  --supernode-url wss://your-domain.com/n2n?community=mycommunity \
  --proxy-url socks5://127.0.0.1:1080  # 可选
```

## 环境变量配置 (wrangler.toml)

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WS_PATH` | `/n2n` | WebSocket 路径 |
| `HEARTBEAT_INTERVAL` | `60` | 心跳间隔(秒) |
| `RATE_LIMIT_PER_MINUTE` | `120` | 每分钟最大请求数 |
| `CACHE_SAVE_INTERVAL` | `300` | 缓存保存间隔(秒) |
| `DISABLE_RELAY` | `0` | `1`=仅 P2P 模式，不中转数据 |
| `ALLOW_P2P` | `1` | `1`=允许 P2P 直连，下发 p2pEndpoint |
| `WHITE_TOKEN` | `""` | 白名单 Token (逗号分隔) |
| `LOG_PASSWORD` | `""` | 设置后开启 `/log` 端点 |
| `LOCAL_DEPLOY` | `false` | `true`=本地模式不持久化 |
| `TURN_SERVERS` | `""` | TURN 服务器列表 (逗号分隔) |
| `TURN_USERNAME` | `n2n` | TURN 用户名 |
| `TURN_PASSWORD` | `n2npassword` | TURN 密码 |

## 监控端点

| 端点 | 说明 |
|------|------|
| `/test` | 健康检查，返回社区状态、连接数、配置 |
| `/room?community=xxx&token=xxx&ip=xxx` | 设备列表页面 (需 Token + Gateway IP 前缀) |
| `/log` | 查看运行日志 (需 `LOG_PASSWORD` 认证) |

## P2P 直连支持

控制面提供以下信令支持，Edge 可实现真正的 P2P 直连：

1. **PeerInfo 下发**: 包含 `p2p_endpoint` (公网 UDP 端点) 和 `capabilities`
2. **ICE Candidate 转发**: 标准 WebRTC 信令转发
3. **TURN 凭证下发**: 集成 coturn REST API (需配置 `TURN_SERVERS`)
4. **VFuze 透传**: 打洞包直接在 Peer 间转发

## 协议兼容性

完全兼容 n2n-go 现有协议：
- `RegisterRequest` / `RegisterResponse`
- `Ping` / `Pong` 心跳
- `PeerInfo` (TypeList/Register/Unregister)
- `SNPublicSecret` (RSA 公钥分发)
- `LeasesInfos` (租约查询)
- `ICECandidate` / `TURNCredentials` (扩展)

## 目录结构

```
src/
├── worker.js              # Worker 入口
├── worker/
│   └── relay_room.js      # Durable Object 核心逻辑
├── core/
│   ├── constants.js       # 协议常量
│   ├── packet.js          # 二进制包编解码
│   ├── handler.js         # 消息处理器
│   ├── context.js         # 社区状态管理 (IPAM + Peer 注册表)
│   ├── ipam.js            # 虚拟 IP 分配器
│   ├── crypto.js          # RSA/AES 加密工具
│   └── logger.js          # 日志工具
```

## 参考项目

本项目参考了以下开源实现：

- **[lmq8267/vnts-cf](https://github.com/lmq8267/vnts-cf)** — Cloudflare Workers 上的 n2n 控制面，提供了 WebSocket 连接管理、社区状态维护、Peer 信息广播等核心模式。`GATEWAY_NAME`、`WHITE_TOKEN`、`LOG_PASSWORD` 等环境变量设计均借鉴于此。
- **[NotTropical/easytier-ws-relay](https://github.com/NotTropical/easytier-ws-relay)** — 基于 easytier 的 WebSocket 中继实现，其 `wrangler.toml` 配置结构和 Durable Object 绑定方式为本项目提供了参考。

## License

MIT