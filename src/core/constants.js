/**
 * n2n-go 协议常量定义
 * 对应 n2n-go/pkg/protocol/spec/spec.go 和 pkg/protocol/netstruct/
 */

// 协议版本号
export const VERSION = 5; // n2n-go v3 protocol version
export const HEADER_SIZE = 30; // 固定头部大小：Ver(1) + TTL(1) + Type(1) + Flags(1) + Seq(2) + CommunityID(4) + SrcMAC(6) + DstMAC(6) + TS(4) + Checksum(4)

// PacketType 定义（对应 spec.PacketType）
export const PacketType = {
  Invalid: 0,
  // n2n-go spec types
  Data: 4,              // TypeData
  RegisterRequest: 1,   // TypeRegisterRequest
  RegisterResponse: 252,// TypeRegisterResponse
  UnregisterRequest: 2, // TypeUnregisterRequest
  Heartbeat: 3,         // TypeHeartbeat
  Ack: 5,               // TypeAck
  PeerListRequest: 6,   // TypePeerListRequest
  PeerInfo: 7,          // TypePeerInfo
  Ping: 8,              // TypePing
  P2PStateInfo: 9,      // TypeP2PStateInfo
  P2PFullState: 10,     // TypeP2PFullState
  LeasesInfos: 11,      // TypeLeasesInfos
  OnlineCheck: 12,      // TypeOnlineCheck
  SNPublicSecret: 251,  // TypeSNPublicSecret (客户端请求公钥 / 服务端响应公钥)
  RetryRegisterRequest: 253, // TypeRetryRegisterRequest
  // Custom types for extended functionality (choose values in unused range 13-250)
  VFuze: 100,           // Custom type for VFuze packets (if needed)
  TURNCredentials: 15,  // Custom type for TURN credentials
  ICECandidate: 14,     // Custom type for ICE candidate
};

// PeerInfo 事件类型
export const PeerInfoEvent = {
  TypeList: 1,      // 完整列表 (matches n2n-go netstruct/peer.go)
  TypeRegister: 2,  // 新节点注册
  TypeUnregister: 3, // 节点注销
  TypeUpdate: 4,    // 状态更新
};

// 标志位
export const Flags = {
  None: 0,
  Compressed: 1 << 0,    // 数据压缩
  Encrypted: 1 << 1,     // 数据加密
  Broadcast: 1 << 2,     // 广播包
  VFuze: 1 << 3,         // VFuze 包
  P2P: 1 << 4,           // P2P 直连包
};

// UDP 写入策略（对应 p2p.UDPWriteStrategy）
export const UDPStrategy = {
  EnforceSupernode: 0,   // 强制走 Supernode
  BestEffort: 1,         // 优先 P2P，失败回退 Supernode
  EnforceP2P: 2,         // 强制 P2P 直连
};

// 社区 ID 计算：使用社区名称的 FNV-1a 哈希低 32 位
export function hashCommunity(name) {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // FNV prime
  }
  return hash >>> 0;
}

// MAC 地址解析/格式化
export function parseMAC(str) {
  const parts = str.split(':').map(x => parseInt(x, 16));
  if (parts.length !== 6 || parts.some(isNaN)) {
    throw new Error(`Invalid MAC address: ${str}`);
  }
  return new Uint8Array(parts);
}

export function formatMAC(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(':');
}

// IPv4 地址转数字 (大端序)
export function ipToNumber(ip) {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

export function numberToIp(num) {
  return `${(num >>> 24) & 255}.${(num >>> 16) & 255}.${(num >>> 8) & 255}.${num & 255}`;
}

// 虚拟 IP 网段：100.64.0.0/10 (CGNAT)
// 可用范围：100.64.0.1 - 100.127.255.254
export const VIRTUAL_NETWORK_BASE = 0x64400000; // 100.64.0.0
export const VIRTUAL_NETWORK_MASK = 0xFFC00000; // /10
export const VIRTUAL_NETWORK_START = 0x64400001; // 100.64.0.1
export const VIRTUAL_NETWORK_END = 0x647FFFFE;   // 100.127.255.254

// 默认 MTU
export const DEFAULT_MTU = 1280;
export const VFuze_HEADER_SIZE = 7; // Go: ProtoVFuzeSize = 7 (Version(1) + DestMAC(6))