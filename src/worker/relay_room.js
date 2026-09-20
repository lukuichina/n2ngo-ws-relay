/**
 * RelayRoom Durable Object
 * 核心控制面实现，参考 vnts-cf 的 RelayRoom 架构：
 * - WebSocket 连接管理
 * - 社区隔离 (每社区一个 DO 实例)
 * - 定时持久化 (Alarm)
 * - 限流、监控端点 (/test, /room, /log)
 * - 心跳管理
 */

import { PacketHandler } from "../core/handler.js";
import { CommunityManager } from "../core/context.js";
import { logger, setPendingStorage } from "../core/logger.js";

export class RelayRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;

    // 全局引用 (用于 logger 等)
    if (typeof globalThis !== "undefined") {
      globalThis.RelayRoomInstance = this;
    }

    // 连接管理: WebSocket -> 连接信息
    this.connections = new Map();

    // 虚拟网段配置（从环境变量读取，支持自定义网段 CIDR）
    this.networkConfig = env.VIRTUAL_NETWORK ? { cidr: env.VIRTUAL_NETWORK } : {};

    // 社区管理器
    this.communityManager = new CommunityManager(this);

    // 数据包处理器
    this.packetHandler = new PacketHandler(env, this);

    // 心跳管理
    this.heartbeatTimers = new Map(); // ws -> timerId
    this.heartbeatInterval = parseInt(env.HEARTBEAT_INTERVAL || "60") * 1000;

    // 限流配置
    this.rateLimitMap = new Map(); // clientIP -> { count, lastReset, endpointCount }
    this.rateLimitConfig = {
      maxRequestsPerMinute: parseInt(env.RATE_LIMIT_PER_MINUTE || "120"),
      windowMs: 60000,
    };

    // 监控统计
    this.requestMetrics = {
      test: { count: 0, lastReset: Date.now() },
      room: { count: 0, lastReset: Date.now() },
      log: { count: 0, lastReset: Date.now() },
    };

    // 缓存保存控制
    this.isSavingCache = false;
    this.pendingSave = false;
    this.lastCacheSaveTime = 0;
    this.saveAlarmScheduled = false;

    // 登录失败计数 (用于 /room 页面保护)
    this.loginAttempts = new Map();

    // 启动时间
    this.startTime = Date.now();

    // 初始化标记
    this.isInitialized = false;
    this.initPromise = null;
  }

  // ---------- 核心生命周期 ----------

  async init() {
    if (!this.isInitialized) {
      if (!this.initPromise) {
        this.initPromise = this.doInit();
      }
      await this.initPromise;
      this.isInitialized = true;
    }
  }

  async doInit() {
    try {
      // 初始化 PacketHandler (加载/生成 SN 密钥)
      await this.packetHandler.init();

      // 设置 logger storage
      await setPendingStorage(this.state.storage);

      // 清除可能存在的旧 Alarm
      await this.state.storage.deleteAlarm();

      // 设置定时保存 Alarm
      await this.setupSaveAlarm();

      // 从 storage 加载已有社区数据 (DO 重建后恢复 peer 状态)
      await this.loadCommunitiesFromStorage();

      logger.info(`[RelayRoom] Initialized for community DO`);
    } catch (e) {
      logger.error("[RelayRoom] Initialization failed:", e);
      throw e;
    }
  }

  /**
   * 从 Durable Object storage 加载已有社区数据。
   * DO 重建后 CommunityManager 是空的，需要从 storage 恢复 peer 状态。
   */
  async loadCommunitiesFromStorage() {
    try {
      const keys = await this.state.storage.list();
      const communityKeys = [];
      for (const [key] of keys) {
        if (key.startsWith("community:")) {
          communityKeys.push(key);
        }
      }

      for (const key of communityKeys) {
        const communityName = key.slice("community:".length);
        // getCommunity() 内部调用 community.load() 从 storage 恢复数据
        const commState = await this.communityManager.getCommunity(communityName);
        const peerCount = commState.getAllPeers().length;
        const onlineCount = commState.countOnline();
        logger.info(`[RelayRoom] Restored community "${communityName}" from storage: ${peerCount} peers (${onlineCount} online)`);
      }
    } catch (e) {
      logger.error("[RelayRoom] Failed to load communities from storage:", e);
    }
  }

  // ---------- WebSocket 处理 ----------

  async fetch(request) {
    await this.init();

    // 设置全局 env 引用
    if (typeof globalThis !== "undefined") {
      globalThis.env = this.env;
    }

    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    // 获取客户端 IP
    const clientIp = this.getClientIp(request);

    // 限流检查
    if (!this.checkRateLimit(clientIp, pathname)) {
      return new Response("Rate limited", { status: 429 });
    }

    // WebSocket 升级
    const wsPath = "/" + (this.env.WS_PATH || "n2n");
    if (pathname === wsPath || pathname === wsPath + "/") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 400 });
      }

      // 从查询参数获取社区名
      const community = searchParams.get("community") || "default";

      // 白名单检查
      if (this.env.WHITE_TOKEN && this.env.WHITE_TOKEN.trim()) {
        const token = searchParams.get("token");
        const tokens = this.env.WHITE_TOKEN.split(",").map(t => t.trim());
        if (!token || !tokens.includes(token)) {
          return new Response("Invalid token", { status: 403 });
        }
      }

      // 创建 WebSocket 对
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // 接受连接
      server.accept();

      // 关联社区
      this.connections.set(server, {
        community,
        macAddr: null,
        virtualIP: null,
        connectedAt: Date.now(),
        clientIp,
      });

      // 设置心跳
      this.setupHeartbeat(server);

      // 处理消息
      server.addEventListener("message", event => this.onMessage(server, event.data));
      server.addEventListener("close", () => this.onClose(server));
      server.addEventListener("error", e => this.onError(server, e));

      return new Response(null, { status: 101, webSocket: client });
    }

    // 监控端点
    if (pathname === "/test") {
      return this.handleTestEndpoint(request, searchParams);
    }

    if (pathname === "/room") {
      return this.handleRoomEndpoint(request, searchParams);
    }

    if (pathname === "/log" || pathname === "/log/clear") {
      return this.handleLogEndpoint(request, searchParams);
    }

    return new Response("Not found", { status: 404 });
  }

  // ---------- WebSocket 事件处理 ----------

  async onMessage(ws, data) {
    await this.packetHandler.handleMessage(ws, data);
  }

  async onClose(ws) {
    const connInfo = this.connections.get(ws);
    if (connInfo && connInfo.macAddr) {
      const commState = await this.communityManager.getCommunity(connInfo.community);
      const peer = commState.getPeer(connInfo.macAddr);
      // 只有 peer 当前仍然绑定在被关闭的这个 WebSocket 上时才标记离线
      // 防止 edge 断线重连后，旧连接的 onClose 覆盖新连接的 online 状态
      if (peer && peer.ws === ws) {
        await commState.unregisterPeer(connInfo.macAddr);

        // 广播下线通知
        await this.packetHandler.broadcastPeerInfo(commState, { macAddr: connInfo.macAddr }, 3); // PeerInfoEvent.TypeUnregister
      }
    }

    // 清理心跳
    this.clearHeartbeat(ws);
    this.connections.delete(ws);
  }

  onError(ws, error) {
    logger.warn(`[RelayRoom] WebSocket error: ${error.message}`);
    this.onClose(ws);
  }

  // ---------- 心跳管理 ----------

  setupHeartbeat(ws) {
    const timer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          // 发送 ProtoV Heartbeat 包 (packetType=3) 而非裸 0x00 字节
          // Go edge 期望 ProtoV 封装的 heartbeat 包
          const connInfo = this.connections.get(ws);
          const community = connInfo ? connInfo.community : "default";
          import("../core/packet.js").then(({ packProtoVDatagram }) =>
            import("../core/constants.js").then(({ VERSION, PacketType, hashCommunity, parseMAC }) => {
              const header = {
                version: VERSION,
                ttl: 64,
                packetType: PacketType.Heartbeat, // 3
                flags: 0,
                sequence: Math.floor(Math.random() * 65536),
                communityId: hashCommunity(community),
                srcMAC: parseMAC("00:00:00:00:00:00"),
                dstMAC: new Uint8Array(6),
                timestamp: Math.floor(Date.now() / 1000),
                checksum: 0,
              };
              const packet = packProtoVDatagram(header, new Uint8Array(0));
              ws.send(packet);
            })
          ).catch((e) => {
            this.clearHeartbeat(ws);
          });
        } catch (e) {
          this.clearHeartbeat(ws);
        }
      } else {
        this.clearHeartbeat(ws);
      }
    }, this.heartbeatInterval);

    this.heartbeatTimers.set(ws, timer);
  }

  clearHeartbeat(ws) {
    const timer = this.heartbeatTimers.get(ws);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(ws);
    }
  }

  // ---------- 限流 ----------

  checkRateLimit(clientIp, endpoint = "default") {
    const now = Date.now();
    const record = this.rateLimitMap.get(clientIp) || {
      count: 0,
      lastReset: now,
      endpointCount: new Map(),
    };

    if (now - record.lastReset > this.rateLimitConfig.windowMs) {
      record.count = 0;
      record.lastReset = now;
      record.endpointCount.clear();
    }

    if (record.count >= this.rateLimitConfig.maxRequestsPerMinute) {
      logger.warn(`[RateLimit] IP ${clientIp} exceeded limit: ${record.count}/${this.rateLimitConfig.maxRequestsPerMinute}`);
      return false;
    }

    record.count++;
    const epCount = record.endpointCount.get(endpoint) || 0;
    record.endpointCount.set(endpoint, epCount + 1);
    this.rateLimitMap.set(clientIp, record);

    // 更新监控
    if (this.requestMetrics[endpoint]) {
      if (now - this.requestMetrics[endpoint].lastReset > this.rateLimitConfig.windowMs) {
        this.requestMetrics[endpoint].count = 0;
        this.requestMetrics[endpoint].lastReset = now;
      }
      this.requestMetrics[endpoint].count++;
    }

    return true;
  }

  getClientIp(request) {
    const headers = {};
    for (const [key, value] of request.headers.entries()) {
      headers[key.toLowerCase()] = value;
    }
    return headers["cf-connecting-ip"] || headers["x-real-ip"] || headers["x-forwarded-for"] || "unknown";
  }

  // ---------- 监控端点 ----------

  handleTestEndpoint(request, searchParams) {
    const community = searchParams.get("community") || "default";
    return new Response(JSON.stringify({
      status: "ok",
      community,
      uptime: this.getRunningDuration(),
      startTime: this.getStartTimeBeijing(),
      connections: this.connections.size,
      rateLimit: this.rateLimitConfig,
      env: {
        WS_PATH: this.env.WS_PATH,
        GATEWAY_NAME: this.env.GATEWAY_NAME || "n2n-gateway",
        ALLOW_P2P: this.env.ALLOW_P2P,
        DISABLE_RELAY: this.env.DISABLE_RELAY,
      },
    }, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  }

  async handleRoomEndpoint(request, searchParams) {
    // 简单的认证检查
    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = this.parseCookies(cookieHeader);

    const token = searchParams.get("token") || cookies.auth_token;
    const gatewayIp = searchParams.get("ip") || cookies.gateway_ip;

    if (!token || !gatewayIp) {
      return new Response(this.getLoginHTML(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 验证 token 和 gateway IP 前缀
    const commState = await this.communityManager.getCommunity(token);
    if (!commState) {
      return new Response(this.getLoginHTML("Community not found"), { status: 404 });
    }

    // 这里可以进一步验证 gateway IP
    // 简化版：直接返回设备列表

    const peers = commState.getAllPeers();
    const onlinePeers = peers.filter(p => p.online);
    const offlinePeers = peers.filter(p => !p.online);

    return new Response(this.getRoomHTML(token, onlinePeers, offlinePeers), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  async handleLogEndpoint(request, searchParams) {
    if (!this.env.LOG_PASSWORD || this.env.LOG_PASSWORD.trim() === "") {
      return new Response("Not found", { status: 404 });
    }

    // 简单密码验证 (实际应用应使用更安全的方式)
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${this.env.LOG_PASSWORD}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (request.method === "POST" && searchParams.has("clear")) {
      logger.clear();
      return new Response("Log cleared");
    }

    return new Response(logger.getLogs().join("\n"), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // ---------- HTML 模板 ----------

  getLoginHTML(error = null) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.env.GATEWAY_NAME || "n2n-go Control Plane"} - Login</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); width: 100%; max-width: 400px; }
    h1 { color: #333; margin-bottom: 1.5rem; text-align: center; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; margin-bottom: 0.5rem; color: #555; font-weight: 500; }
    input { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; box-sizing: border-box; }
    button { width: 100%; padding: 0.75rem; background: #667eea; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #5568d3; }
    .error { color: #e74c3c; text-align: center; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${this.env.GATEWAY_NAME || "n2n-go Control Plane"}</h1>
    ${error ? `<div class="error">${error}</div>` : ''}
    <form method="GET" action="/room" id="loginForm">
      <div class="form-group">
        <label>Community Token</label>
        <input type="text" name="token" required placeholder="Enter community token" id="tokenInput">
      </div>
      <input type="hidden" name="community" id="communityInput">
      <div class="form-group">
        <label>Gateway IP (first 3 octets)</label>
        <input type="text" name="ip" required placeholder="e.g. 100.64.0">
      </div>
      <button type="submit">View Devices</button>
    </form>
    <script>
      document.getElementById('loginForm').addEventListener('submit', function(e) {
        document.getElementById('communityInput').value = document.getElementById('tokenInput').value;
      });
    </script>
  </div>
</body></html>`;
  }

  getRoomHTML(token, onlinePeers, offlinePeers) {
    const formatIp = (num) => `${(num >>> 24) & 255}.${(num >>> 16) & 255}.${(num >>> 8) & 255}.${num & 255}`;

    const row = (peer, isOnline) => `
      <tr class="${isOnline ? '' : 'offline'}">
        <td>${peer.macAddr}</td>
        <td>${formatIp(peer.virtualIP)}</td>
        <td>${peer.pubSocket || '-'}</td>
        <td>${peer.p2pEndpoint || '-'}</td>
        <td>${peer.natType || 'unknown'}</td>
        <td>${isOnline ? '🟢 Online' : '🔴 Offline'}</td>
        <td>${peer.capabilities?.join(', ') || '-'}</td>
        <td>${new Date(peer.lastSeen * 1000).toLocaleString()}</td>
      </tr>
    `;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Community: ${token}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; }
    .stats { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); flex: 1; text-align: center; }
    .stat-value { font-size: 2rem; font-weight: bold; color: #667eea; }
    .stat-label { color: #666; margin-top: 0.5rem; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #333; }
    tr.offline { opacity: 0.6; background: #fafafa; }
    tr:hover { background: #f0f4ff; }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; background: #e3f2fd; color: #1976d2; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${this.env.GATEWAY_NAME || "n2n-gateway"} - Community: ${token}</h1>
    <div class="stats">
      <div class="stat-card"><div class="stat-value">${onlinePeers.length}</div><div class="stat-label">Online</div></div>
      <div class="stat-card"><div class="stat-value">${offlinePeers.length}</div><div class="stat-label">Offline</div></div>
      <div class="stat-card"><div class="stat-value">${onlinePeers.length + offlinePeers.length}</div><div class="stat-label">Total</div></div>
    </div>
    <table>
      <thead>
        <tr><th>MAC Address</th><th>Virtual IP</th><th>Public Socket</th><th>P2P Endpoint</th><th>NAT Type</th><th>Status</th><th>Capabilities</th><th>Last Seen</th></tr>
      </thead>
      <tbody>
        ${onlinePeers.map(p => row(p, true)).join('')}
        ${offlinePeers.map(p => row(p, false)).join('')}
      </tbody>
    </table>
  </div>
</body></html>`;
  }

  // ---------- 持久化与 Alarm ----------

  async saveAppCache(skipInitCheck = false) {
    const isLocalDeploy = this.env.LOCAL_DEPLOY === "true";
    if (isLocalDeploy) return;

    if (!skipInitCheck && !this.isInitialized) return;

    if (this.isSavingCache) {
      this.pendingSave = true;
      return;
    }

    try {
      this.isSavingCache = true;
      this.pendingSave = false;

      // 保存所有社区状态
      await this.communityManager.saveAll();

      this.lastCacheSaveTime = Date.now();
      logger.debug("[RelayRoom] Cache saved");
    } catch (e) {
      logger.error("[RelayRoom] Save failed:", e);
    } finally {
      this.isSavingCache = false;
      if (this.pendingSave) {
        Promise.resolve().then(() => this.saveAppCache());
      }
    }
  }

  async setupSaveAlarm() {
    const isLocalDeploy = this.env.LOCAL_DEPLOY === "true";
    if (isLocalDeploy) return;

    const saveIntervalMs = parseInt(this.env.CACHE_SAVE_INTERVAL || "300") * 1000;
    await this.state.storage.setAlarm(Date.now() + saveIntervalMs);
    this.saveAlarmScheduled = true;
    logger.debug(`[Alarm] Scheduled save in ${saveIntervalMs / 1000}s`);
  }

  async alarm() {
    try {
      await this.saveAppCache();
      await this.setupSaveAlarm();
    } catch (e) {
      logger.error("[Alarm] Failed:", e);
      try { await this.setupSaveAlarm(); } catch (_) {}
    }
  }

  // ---------- 工具函数 ----------

  parseCookies(header) {
    const cookies = {};
    if (header) {
      header.split(";").forEach(c => {
        const [name, value] = c.trim().split("=");
        if (name && value) cookies[name] = decodeURIComponent(value);
      });
    }
    return cookies;
  }

  getRunningDuration() {
    const duration = Date.now() - this.startTime;
    const days = Math.floor(duration / 86400000);
    const hours = Math.floor((duration % 86400000) / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  getStartTimeBeijing() {
    const d = new Date(this.startTime + 8 * 3600000);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  }
}