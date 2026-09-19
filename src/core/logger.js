/**
 * 简单日志工具
 * 支持级别、结构化日志、存储到 DO storage
 */

let pendingStorage = null;
const logBuffer = [];
const MAX_BUFFER = 1000;

export function setPendingStorage(storage) {
  pendingStorage = storage;
}

export const logger = {
  debug: (...args) => log("DEBUG", ...args),
  info: (...args) => log("INFO", ...args),
  warn: (...args) => log("WARN", ...args),
  error: (...args) => log("ERROR", ...args),

  getLogs: () => [...logBuffer],

  clear: () => {
    logBuffer.length = 0;
  },

  // 导出日志到存储 (可选)
  async flush() {
    if (!pendingStorage) return;
    try {
      await pendingStorage.put("logs", {
        logs: logBuffer.slice(-500), // 只保留最近 500 条
        flushedAt: Date.now(),
      });
    } catch (e) {
      console.error("[Logger] Flush failed:", e);
    }
  },
};

function log(level, ...args) {
  const timestamp = new Date().toISOString();
  const message = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  const entry = `[${timestamp}] [${level}] ${message}`;

  // 控制台输出
  const colors = {
    DEBUG: "\x1b[36m",
    INFO: "\x1b[32m",
    WARN: "\x1b[33m",
    ERROR: "\x1b[31m",
    RESET: "\x1b[0m",
  };
  console.log(`${colors[level] || ""}${entry}${colors.RESET}`);

  // 内存缓冲
  logBuffer.push({ timestamp, level, message });
  if (logBuffer.length > MAX_BUFFER) {
    logBuffer.shift();
  }
}