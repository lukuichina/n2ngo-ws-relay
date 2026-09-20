/**
 * n2n-go 二进制包编解码
 * 
 * ProtoV 头部处理（二进制）+ 消息体 protobuf 编解码
 * 彻底抛弃 JSON/GOB，统一使用 protobuf
 * 
 * 对应 Go 侧：
 *   - ProtoV 头部：n2n-go/pkg/protocol/protov.go
 *   - 消息体：n2n-go/pkg/protocol/codec/codec.go（protobuf）
 *   - 消息类型：n2n-go/pkg/protocol/netstruct/
 */

import {
  VERSION,
  HEADER_SIZE,
  PacketType,
  hashCommunity,
  parseMAC,
  formatMAC,
  ipToNumber,
  numberToIp,
  VFuze_HEADER_SIZE,
  PeerInfoEvent,
  Flags,
} from "./constants.js";
import { encode, decode, getType } from "./protos.js";

// ---------- 基础读写工具 ----------

function writeUint32(view, offset, value) {
  view.setUint32(offset, value, false);
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, false);
}

function writeUint8(view, offset, value) {
  view.setUint8(offset, value);
}

// ---------- ProtoV 头部解析/序列化 ----------

export function parseProtoVHeader(buf) {
  if (buf.length < HEADER_SIZE) {
    throw new Error(`Buffer too small for ProtoV header: ${buf.length} < ${HEADER_SIZE}`);
  }
  const view = new DataView(buf.buffer, buf.byteOffset, HEADER_SIZE);
  const version = view.getUint8(0);
  if (version !== VERSION) {
    throw new Error(`Invalid version: 0x${version.toString(16)} expected 0x${VERSION.toString(16)}`);
  }
  return {
    version,
    ttl: view.getUint8(1),
    packetType: view.getUint8(2),
    flags: view.getUint8(3),
    sequence: view.getUint16(4),
    communityId: view.getUint32(6),
    srcMAC: new Uint8Array(buf.buffer, buf.byteOffset + 10, 6),
    dstMAC: new Uint8Array(buf.buffer, buf.byteOffset + 16, 6),
    timestamp: view.getUint32(22),
    checksum: view.getUint32(26),
  };
}

export function serializeProtoVHeader(hdr) {
  const buf = new ArrayBuffer(HEADER_SIZE);
  const view = new DataView(buf);
  writeUint8(view, 0, hdr.version || VERSION);
  writeUint8(view, 1, hdr.ttl || 64);
  writeUint8(view, 2, hdr.packetType || PacketType.Data);
  writeUint8(view, 3, hdr.flags || 0);
  writeUint16(view, 4, hdr.sequence || 0);
  writeUint32(view, 6, hdr.communityId || 0);
  if (hdr.srcMAC) new Uint8Array(buf, 10, 6).set(hdr.srcMAC);
  if (hdr.dstMAC) new Uint8Array(buf, 16, 6).set(hdr.dstMAC);
  writeUint32(view, 22, hdr.timestamp || Math.floor(Date.now() / 1000));
  writeUint32(view, 26, hdr.checksum || 0);
  return new Uint8Array(buf);
}

export function packProtoVDatagram(hdr, payload) {
  const header = serializeProtoVHeader(hdr);
  const out = new Uint8Array(header.length + payload.length);
  out.set(header, 0);
  out.set(payload, header.length);
  return out;
}

export function unpackProtoVDatagram(buf) {
  if (buf.length < HEADER_SIZE) {
    throw new Error(`Packet too short: ${buf.length} < ${HEADER_SIZE}`);
  }
  const header = parseProtoVHeader(buf);
  const payload = buf.slice(HEADER_SIZE);
  return { header, payload };
}

/**
 * 标记数据包为来自 Supernode（对齐 Go 侧 protocol.FlagPacketFromSupernode）
 *
 * 解包 ProtoV 头部，设置 FlagFromSuperNode 标志位，重新打包。
 * 对应 Go 侧：
 *
 * func FlagPacketFromSupernode(packet []byte) ([]byte, error) {
 *     header, payload, err := UnpackProtoVDatagram(packet)
 *     if err != nil { return nil, err }
 *     header.SetFromSupernode(true)
 *     return PackProtoVDatagram(header, payload), nil
 * }
 *
 * @param {Uint8Array} packet - 原始 ProtoV 数据报
 * @returns {Uint8Array} 标记后的数据报
 */
export function flagPacketFromSupernode(packet) {
  const { header, payload } = unpackProtoVDatagram(packet);
  header.flags |= Flags.FromSupernode;
  return packProtoVDatagram(header, payload);
}

// ============================================================
// Protobuf 消息体编解码 — 彻底抛弃 JSON/GOB
// ============================================================

// ---------- RegisterRequest ----------

function macStrToBytes(macStr) {
  const parts = macStr.split(':').map(p => parseInt(p, 16));
  return new Uint8Array(parts);
}

function macBytesToStr(macBytes) {
  if (typeof macBytes === 'string') return macBytes;
  const arr = macBytes instanceof Uint8Array ? macBytes : new Uint8Array(macBytes);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join(':');
}

export function encodeRegisterRequest(msg) {
  return encode("RegisterRequest", {
    edgeMacAddr: msg.edgeMACAddr,
    communityName: msg.communityName,
    encryptedMachineId: msg.encryptedMachineID || new Uint8Array(0),
    p2pEndpoint: msg.p2pEndpoint || "",
    p2pCapabilities: msg.p2pCapabilities || [],
  });
}

export function decodeRegisterRequest(buf) {
  const data = decode("RegisterRequest", buf);
  return {
    edgeMACAddr: data.edgeMacAddr,
    communityName: data.communityName,
    encryptedMachineID: data.encryptedMachineId || new Uint8Array(0),
    p2pEndpoint: data.p2pEndpoint || "",
    p2pCapabilities: data.p2pCapabilities || [],
  };
}

// ---------- RegisterResponse ----------

export function encodeRegisterResponse(msg) {
  const ipStr = typeof msg.virtualIP === 'number'
    ? numberToIp(msg.virtualIP)
    : msg.virtualIP;

  const peers = (msg.peers || []).map(p => {
    // 兼容两种命名风格: context.js 使用 snake_case, 其他地方使用 camelCase
    const macAddr = p.mac_addr || p.macAddr;
    const vIP = typeof p.virtual_ip === 'number'
      ? numberToIp(p.virtual_ip)
      : (typeof p.virtualIP === 'number' ? numberToIp(p.virtualIP) : (p.virtual_ip || p.virtualIP));

    let pubSocket = "";
    const pubSocketVal = p.pub_socket || p.pubSocket;
    if (pubSocketVal) {
      if (typeof pubSocketVal === 'string') {
        pubSocket = pubSocketVal;
      } else if (typeof pubSocketVal === 'object' && pubSocketVal.ip) {
        pubSocket = `${pubSocketVal.ip}:${pubSocketVal.port || 0}`;
      }
    }

    return {
      virtualIp: vIP,
      macAddr: macStrToBytes(macAddr),
      pubSocket: pubSocket,
      p2pEndpoint: p.p2p_endpoint || p.p2pEndpoint || "",
      natType: p.nat_type || p.natType || "unknown",
      lastSeen: p.last_seen || p.lastSeen || 0,
      p2pCapabilities: p.capabilities || p.p2p_capabilities || p.p2pCapabilities || [],
    };
  });

  return encode("RegisterResponse", {
    isRegisterOk: msg.isRegisterOk,
    virtualIp: ipStr,
    masklen: msg.masklen || 0,
    snPublicKey: msg.snPublicKey || new Uint8Array(0),
    communityName: msg.communityName || "",
    assignedMac: msg.assignedMAC || "",
    peers,
  });
}

export function decodeRegisterResponse(buf) {
  const data = decode("RegisterResponse", buf);
  return {
    isRegisterOk: data.isRegisterOk,
    virtualIP: data.virtualIp,
    masklen: data.masklen,
    snPublicKey: data.snPublicKey || new Uint8Array(0),
    communityName: data.communityName,
    assignedMAC: data.assignedMac || "",
    peers: (data.peers || []).map(p => {
      let pubSocket = p.pubSocket;
      if (typeof pubSocket === 'object' && pubSocket !== null) {
        pubSocket = `${pubSocket.ip}:${pubSocket.port}`;
      }
      return {
        macAddr: macBytesToStr(p.macAddr),
        virtualIP: p.virtualIp,
        pubSocket: pubSocket || "",
        p2pEndpoint: p.p2pEndpoint || "",
        natType: p.natType || "unknown",
        lastSeen: p.lastSeen || 0,
        capabilities: p.p2pCapabilities || [],
      };
    }),
  };
}

// ---------- PeerInfo / PeerInfoList ----------

function toPubSocketStr(pubSocket) {
  if (!pubSocket) return "";
  if (typeof pubSocket === 'string') return pubSocket;
  if (typeof pubSocket === 'object' && pubSocket.ip) {
    return `${pubSocket.ip}:${pubSocket.port || 0}`;
  }
  return "";
}

export function encodePeerInfoList(list) {
  // 兼容两种命名风格: context.js 使用 snake_case, 其他地方使用 camelCase
  const originList = list.origin;
  const hasOrigin = list.has_origin != null ? list.has_origin : list.hasOrigin;
  const eventType = list.event_type != null ? list.event_type : list.eventType;
  const peerInfoList = list.peer_infos != null ? list.peer_infos : list.peerInfos;

  const origin = originList ? {
    virtualIp: typeof originList.virtual_ip === 'number'
      ? numberToIp(originList.virtual_ip)
      : (typeof originList.virtualIP === 'number' ? numberToIp(originList.virtualIP) : (originList.virtual_ip || originList.virtualIP)),
    macAddr: macStrToBytes(originList.mac_addr || originList.macAddr),
    pubSocket: toPubSocketStr(originList.pub_socket || originList.pubSocket),
    p2pEndpoint: originList.p2p_endpoint || originList.p2pEndpoint || "",
    natType: originList.nat_type || originList.natType || "unknown",
    lastSeen: originList.last_seen || originList.lastSeen || Math.floor(Date.now() / 1000),
    p2pCapabilities: originList.capabilities || originList.p2p_capabilities || originList.p2pCapabilities || [],
  } : null;

  const peerInfos = (peerInfoList || []).map(p => ({
    virtualIp: typeof p.virtual_ip === 'number'
      ? numberToIp(p.virtual_ip)
      : (typeof p.virtualIP === 'number' ? numberToIp(p.virtualIP) : (p.virtual_ip || p.virtualIP)),
    macAddr: macStrToBytes(p.mac_addr || p.macAddr),
    pubSocket: toPubSocketStr(p.pub_socket || p.pubSocket),
    p2pEndpoint: p.p2p_endpoint || p.p2pEndpoint || "",
    natType: p.nat_type || p.natType || "unknown",
    lastSeen: p.last_seen || p.lastSeen || Math.floor(Date.now() / 1000),
    p2pCapabilities: p.capabilities || p.p2p_capabilities || p.p2pCapabilities || [],
  }));

  return encode("PeerInfoList", {
    hasOrigin: hasOrigin || false,
    origin,
    peerInfos,
    eventType: eventType || PeerInfoEvent.TypeList,
  });
}

export function decodePeerInfoList(buf) {
  const data = decode("PeerInfoList", buf);
  return {
    origin: data.origin ? {
      macAddr: macBytesToStr(data.origin.macAddr),
      virtualIP: data.origin.virtualIp,
      pubSocket: data.origin.pubSocket,
      p2pEndpoint: data.origin.p2pEndpoint,
      natType: data.origin.natType,
      lastSeen: data.origin.lastSeen,
      capabilities: data.origin.p2pCapabilities || [],
    } : null,
    hasOrigin: data.hasOrigin || false,
    peerInfos: (data.peerInfos || []).map(p => {
      let pubSocket = p.pubSocket;
      if (typeof pubSocket === 'object' && pubSocket !== null) {
        pubSocket = `${pubSocket.ip}:${pubSocket.port}`;
      }
      return {
        macAddr: macBytesToStr(p.macAddr),
        virtualIP: p.virtualIp,
        pubSocket: pubSocket || "",
        p2pEndpoint: p.p2pEndpoint || "",
        natType: p.natType || "unknown",
        lastSeen: p.lastSeen || 0,
        capabilities: p.p2pCapabilities || [],
      };
    }),
    eventType: data.eventType || PeerInfoEvent.TypeList,
  };
}

// ---------- SNPublicSecret ----------

export function encodeSNPublicSecret(pubKey, isRequest = false) {
  const obj = {
    isRequest: isRequest,
    pemData: pubKey || new Uint8Array(0),
  };
  const result = encode("SnPublicSecret", obj);
  console.log(`[encodeSNPublicSecret] isRequest=${isRequest}, pubKey length=${pubKey ? pubKey.length : 0}, encoded length=${result.length}`);
  return result;
}

export function decodeSNPublicSecret(buf) {
  const data = decode("SnPublicSecret", buf);
  console.log(`[decodeSNPublicSecret] raw buf length=${buf.length}, decoded isRequest=${data.isRequest}, pemData length=${data.pemData ? data.pemData.length : 'undefined'}`);
  return {
    isRequest: data.isRequest,
    publicKey: data.pemData || new Uint8Array(0),
  };
}

// ---------- ICE Candidate ----------

export function encodeICECandidate(msg) {
  return encode("ICECandidate", {
    targetMac: msg.targetMAC,
    candidate: msg.candidate || "",
    sdpMid: msg.sdpMid || "",
    sdpMlineIndex: msg.sdpMLineIndex || 0,
  });
}

export function decodeICECandidate(buf) {
  const data = decode("ICECandidate", buf);
  return {
    targetMAC: data.targetMac,
    candidate: data.candidate || "",
    sdpMid: data.sdpMid || "",
    sdpMLineIndex: data.sdpMlineIndex || 0,
  };
}

// ---------- TURNCredentials ----------

export function encodeTURNCredentials(msg) {
  return encode("TURNCredentials", {
    username: msg.username || "",
    password: msg.password || "",
    ttl: msg.ttl || 86400,
    uris: msg.uris || [],
  });
}

export function decodeTURNCredentials(buf) {
  const data = decode("TURNCredentials", buf);
  return {
    username: data.username || "",
    password: data.password || "",
    ttl: data.ttl || 86400,
    uris: data.uris || [],
  };
}

// ---------- P2P State (PeerP2PInfos / P2PFullState / PeerCachedInfo) ----------

/**
 * 编码 PeerP2PInfos (type 9 payload)
 * 对应 Go 侧 p2p.PeerP2PInfos
 */
export function encodePeerP2PInfos(msg) {
  const from = msg.from ? {
    virtualIp: msg.from.virtualIp || msg.from.virtual_ip || "",
    macAddr: macStrToBytes(msg.from.macAddr || msg.from.mac_addr),
    pubSocket: toPubSocketStr(msg.from.pubSocket || msg.from.pub_socket),
    p2pEndpoint: msg.from.p2pEndpoint || msg.from.p2p_endpoint || "",
    natType: msg.from.natType || msg.from.nat_type || "unknown",
    lastSeen: msg.from.lastSeen || msg.from.last_seen || Math.floor(Date.now() / 1000),
    p2pCapabilities: msg.from.capabilities || msg.from.p2p_capabilities || msg.from.p2pCapabilities || [],
  } : null;

  const to = (msg.to || []).map(p => ({
    virtualIp: typeof p.virtual_ip === 'number'
      ? numberToIp(p.virtual_ip)
      : (typeof p.virtualIP === 'number' ? numberToIp(p.virtualIP) : (p.virtual_ip || p.virtualIP)),
    macAddr: macStrToBytes(p.mac_addr || p.macAddr),
    pubSocket: toPubSocketStr(p.pub_socket || p.pubSocket),
    p2pEndpoint: p.p2p_endpoint || p.p2pEndpoint || "",
    natType: p.nat_type || p.natType || "unknown",
    lastSeen: p.last_seen || p.lastSeen || Math.floor(Date.now() / 1000),
    p2pCapabilities: p.capabilities || p.p2p_capabilities || p.p2pCapabilities || [],
  }));

  return encode("PeerP2PInfos", { from, to });
}

export function decodePeerP2PInfos(buf) {
  const data = decode("PeerP2PInfos", buf);
  const from = data.from ? {
    virtualIp: data.from.virtualIp || data.from.virtual_ip || "",
    macAddr: macBytesToStr(data.from.macAddr),
    pubSocket: toPubSocketStr(data.from.pubSocket || data.from.pub_socket),
    p2pEndpoint: data.from.p2pEndpoint || data.from.p2p_endpoint || "",
    natType: data.from.natType || data.from.nat_type || "unknown",
    lastSeen: data.from.lastSeen || data.from.last_seen || 0,
    p2pCapabilities: data.from.capabilities || data.from.p2p_capabilities || data.from.p2pCapabilities || [],
  } : null;

  const to = (data.to || []).map(p => ({
    virtualIp: p.virtualIp || p.virtual_ip || "",
    macAddr: macBytesToStr(p.macAddr),
    pubSocket: toPubSocketStr(p.pubSocket || p.pub_socket),
    p2pEndpoint: p.p2pEndpoint || p.p2p_endpoint || "",
    natType: p.natType || p.nat_type || "unknown",
    lastSeen: p.lastSeen || p.last_seen || 0,
    p2pCapabilities: p.capabilities || p.p2p_capabilities || p.p2pCapabilities || [],
  }));

  return { from, to };
}

/**
 * 编码 P2PFullState (type 10 payload)
 * 对应 Go 侧 p2p.P2PFullState
 */
export function encodeP2PFullState(msg) {
  const reachables = {};
  if (msg.reachables) {
    for (const [mac, infos] of Object.entries(msg.reachables)) {
      reachables[mac] = {
        from: infos.from ? {
          virtualIp: infos.from.virtualIp || infos.from.virtual_ip || "",
          macAddr: macStrToBytes(infos.from.macAddr || infos.from.mac_addr),
          pubSocket: toPubSocketStr(infos.from.pubSocket || infos.from.pub_socket),
          p2pEndpoint: infos.from.p2pEndpoint || infos.from.p2p_endpoint || "",
          natType: infos.from.natType || infos.from.nat_type || "unknown",
          lastSeen: infos.from.lastSeen || infos.from.last_seen || Math.floor(Date.now() / 1000),
          p2pCapabilities: infos.from.capabilities || infos.from.p2p_capabilities || infos.from.p2pCapabilities || [],
        } : null,
        to: (infos.to || []).map(p => ({
          virtualIp: typeof p.virtual_ip === 'number'
            ? numberToIp(p.virtual_ip)
            : (typeof p.virtualIP === 'number' ? numberToIp(p.virtualIP) : (p.virtual_ip || p.virtualIP)),
          macAddr: macStrToBytes(p.mac_addr || p.macAddr),
          pubSocket: toPubSocketStr(p.pub_socket || p.pubSocket),
          p2pEndpoint: p.p2p_endpoint || p.p2pEndpoint || "",
          natType: p.nat_type || p.natType || "unknown",
          lastSeen: p.last_seen || p.lastSeen || Math.floor(Date.now() / 1000),
          p2pCapabilities: p.capabilities || p.p2p_capabilities || p.p2pCapabilities || [],
        })),
      };
    }
  }

  const unreachables = {};
  if (msg.unreachables) {
    for (const [mac, info] of Object.entries(msg.unreachables)) {
      unreachables[mac] = {
        desc: info.desc || "",
        macAddr: info.macAddr || info.mac_addr || "",
        virtualIp: info.virtualIp || info.virtual_ip || "",
        community: info.community || "",
        lastUpdateNs: info.lastUpdateNs || info.last_update_ns || 0,
      };
    }
  }

  return encode("P2PFullState", {
    communityName: msg.communityName || msg.community_name || "",
    isRequest: msg.isRequest != null ? msg.isRequest : (msg.is_request != null ? msg.is_request : false),
    reachables,
    unreachables,
  });
}

export function decodeP2PFullState(buf) {
  const data = decode("P2PFullState", buf);

  const reachables = {};
  if (data.reachables) {
    for (const [mac, infos] of Object.entries(data.reachables)) {
      const from = infos.from ? {
        virtualIp: infos.from.virtualIp || infos.from.virtual_ip || "",
        macAddr: macBytesToStr(infos.from.macAddr),
        pubSocket: toPubSocketStr(infos.from.pubSocket || infos.from.pub_socket),
        p2pEndpoint: infos.from.p2pEndpoint || infos.from.p2p_endpoint || "",
        natType: infos.from.natType || infos.from.nat_type || "unknown",
        lastSeen: infos.from.lastSeen || infos.from.last_seen || 0,
        p2pCapabilities: infos.from.capabilities || infos.from.p2p_capabilities || infos.from.p2pCapabilities || [],
      } : null;

      const to = (infos.to || []).map(p => ({
        virtualIp: p.virtualIp || p.virtual_ip || "",
        macAddr: macBytesToStr(p.macAddr),
        pubSocket: toPubSocketStr(p.pubSocket || p.pub_socket),
        p2pEndpoint: p.p2pEndpoint || p.p2p_endpoint || "",
        natType: p.natType || p.nat_type || "unknown",
        lastSeen: p.lastSeen || p.last_seen || 0,
        p2pCapabilities: p.capabilities || p.p2p_capabilities || p.p2pCapabilities || [],
      }));

      reachables[mac] = { from, to };
    }
  }

  const unreachables = {};
  if (data.unreachables) {
    for (const [mac, info] of Object.entries(data.unreachables)) {
      unreachables[mac] = {
        desc: info.desc || "",
        macAddr: info.macAddr || info.mac_addr || "",
        virtualIp: info.virtualIp || info.virtual_ip || "",
        community: info.community || "",
        lastUpdateNs: info.lastUpdateNs || info.last_update_ns || 0,
      };
    }
  }

  return {
    communityName: data.communityName || data.community_name || "",
    isRequest: data.isRequest != null ? data.isRequest : (data.is_request != null ? data.is_request : false),
    reachables,
    unreachables,
  };
}

// ---------- VFuze 包处理 ----------

export function parseVFuzeHeader(buf) {
  if (buf.length < VFuze_HEADER_SIZE) {
    throw new Error(`VFuze header too small: ${buf.length}`);
  }
  return {
    version: buf[0],
    dstMAC: new Uint8Array(buf.buffer, buf.byteOffset + 1, 6),
  };
}

export function createVFuzeHeader(dstMAC) {
  const hdr = new Uint8Array(VFuze_HEADER_SIZE);
  hdr[0] = 0x51;
  hdr.set(dstMAC, 1);
  return hdr;
}

// ---------- 通用工具 ----------

export function concatUint8Arrays(...arrays) {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export function uint8ArrayToHex(arr) {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToUint8Array(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}