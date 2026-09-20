/**
 * n2n-go WebSocket Control Plane - Cloudflare Worker Entry Point
 * 
 * 架构：
 * - 每个社区一个 Durable Object 实例 (通过 community 名称隔离)
 * - WebSocket 连接处理注册、心跳、PeerInfo 同步、ICE Candidate 转发
 * - 内置监控端点：/test, /room, /log
 * - 支持 P2P 直连信令、TURN 凭证下发
 * 
 * 客户端连接示例：
 *   wss://your-worker.domain/n2n?community=mycommunity&token=xxx
 */

import { RelayRoom } from "./worker/relay_room.js";

export { RelayRoom };

export default {
  async fetch(request, env, ctx) {
    // 设置全局环境引用 (供 logger 等使用)
    if (typeof globalThis !== "undefined") {
      globalThis.env = env;
    }

    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    // 地理位置提示配置 (可选)
    const options = env.LOCATION_HINT ? { locationHint: env.LOCATION_HINT } : {};

    const wsPath = "/" + (env.WS_PATH || "n2n");

    // WebSocket 升级 (支持根路径和指定路径)
    if ((pathname === wsPath || pathname === wsPath + "/") || 
        (wsPath === "/n2n" && (pathname === "/" || pathname === ""))) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 400 });
      }

      // 从查询参数获取社区名 (作为 DO 隔离键)
      const community = searchParams.get("community") || "default";

      // Token 白名单验证 (可选)
      if (env.WHITE_TOKEN && env.WHITE_TOKEN.trim()) {
        const token = searchParams.get("token");
        const tokens = env.WHITE_TOKEN.split(",").map(t => t.trim());
        if (!token || !tokens.includes(token)) {
          return new Response("Invalid token", { status: 403 });
        }
      }

      // 获取/创建该社区的 DO 实例
      const roomStub = env.RELAY_ROOM.get(env.RELAY_ROOM.idFromName(community), options);
      return roomStub.fetch(request);
    }

    // 健康检查端点
    if (pathname === "/test") {
      const community = searchParams.get("community") || "default";
      const roomStub = env.RELAY_ROOM.get(env.RELAY_ROOM.idFromName(community), options);
      return roomStub.fetch(request);
    }

    // 设备列表查询端点 (HTML 页面)
    if (pathname === "/room") {
      const community = searchParams.get("community") || searchParams.get("token") || "default";
      const roomStub = env.RELAY_ROOM.get(env.RELAY_ROOM.idFromName(community), options);
      return roomStub.fetch(request);
    }

    // 日志查看端点
    if (pathname === "/log" || pathname === "/log/clear") {
      if (!env.LOG_PASSWORD || env.LOG_PASSWORD.trim() === "") {
        return new Response("Not found", { status: 404 });
      }
      const community = searchParams.get("community") || "default";
      const roomStub = env.RELAY_ROOM.get(env.RELAY_ROOM.idFromName(community), options);
      return roomStub.fetch(request);
    }

    // 根路径重定向到文档或状态页
    if (pathname === "/") {
      return Response.redirect(new URL("/test", request.url), 302);
    }

    return new Response("Not found", { status: 404 });
  },
};