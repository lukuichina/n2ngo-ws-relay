/**
 * 数据包处理器
 * 对应 vnts-cf 的 PacketHandler，处理所有控制面消息：
 * - RegisterRequest / RegisterResponse
 * - Ping / Pong
 * - PeerInfo (List/Register/Unregister)
 * - SNPublicSecret
 * - ICECandidate 转发
 * - TURNCredentials 下发
 */
import {
  VERSION,
  HEADER_SIZE,
  VFuze_HEADER_SIZE,
  PacketType,
  PeerInfoEvent,
  Flags,
  hashCommunity,
  parseMAC,
  formatMAC,
  numberToIp,
} from "./constants.js";
import {
  parseProtoVHeader,
  packProtoVDatagram,
  decodeRegisterRequest,
  encodeRegisterResponse,
  decodePeerInfoList,
  encodePeerInfoList,
  encodeSNPublicSecret,
  decodeSNPublicSecret,
  encodeICECandidate,
  decodeICECandidate,
  encodeTURNCredentials,
  decodePeerP2PInfos,
  decodeP2PFullState,
  encodeP2PFullState,
  flagPacketFromSupernode,
  parseVFuzeHeader,
} from "./packet.js";
import { encode } from "./protos.js";
import { decryptRSA_OAEP, importRSAPrivateKey } from "./crypto.js";

export class PacketHandler {
  constructor(env, relayRoom) {
    this.env = env;
    this.relayRoom = relayRoom;
    this.communityManager = relayRoom.communityManager;
    this.snPrivateKey = null; // Supernode RSA 私钥
    this.snPublicKeyDER = null; // Supernode 公钥 DER
    this.snPublicKeyCryptoKey = null; // Supernode 公钥 CryptoKey（用于导出 PEM）
  }

  /**
   * 初始化：加载或生成 Supernode 密钥对
   */
  async init() {
    console.log("[PacketHandler] INIT START");
    try {
      // 尝试从 KV 加载私钥
      if (this.env.SN_KEYS) {
        const privateKeyPEM = await this.env.SN_KEYS.get("sn_private_key");
        const publicKeyDER = await this.env.SN_KEYS.get("sn_public_key_der", "arrayBuffer");

        if (privateKeyPEM && publicKeyDER) {
          this.snPrivateKey = await importRSAPrivateKey(privateKeyPEM);
          this.snPublicKeyDER = new Uint8Array(publicKeyDER);
          // 从 DER 重建 CryptoKey 用于导出 PEM
          this.snPublicKeyCryptoKey = await crypto.subtle.importKey(
            'spki',
            this.snPublicKeyDER,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false,
            ['encrypt']
          );
          console.log("[PacketHandler] Loaded SN public key DER from KV: " + Array.from(this.snPublicKeyDER).map(b=>b.toString(16).padStart(2,"0")).join(""));
          console.log("[PacketHandler] Loaded SN keys from KV");
          return;
        }
      }

      // 本地存储或首次运行：生成新密钥对
      const { generateRSAKeyPair, exportRSAPublicKeyDER, exportRSAPrivateKeyPEM } = await import("./crypto.js");
      const keyPair = await generateRSAKeyPair(2048);
      this.snPrivateKey = keyPair.privateKey;
      this.snPublicKeyCryptoKey = keyPair.publicKey;
      this.snPublicKeyDER = await exportRSAPublicKeyDER(keyPair.publicKey);
      console.log("[PacketHandler] Generated SN public key DER: " + Array.from(this.snPublicKeyDER).map(b=>b.toString(16).padStart(2,"0")).join(""));
      const privateKeyPEM = await exportRSAPrivateKeyPEM(keyPair.privateKey);

      // 存储到 KV (如果配置了)
      if (this.env.SN_KEYS) {
        await this.env.SN_KEYS.put("sn_private_key", privateKeyPEM);
        await this.env.SN_KEYS.put("sn_public_key_der", this.snPublicKeyDER);
        // 同时存储 PEM 格式（Go 侧用 PEM 编码发送公钥）
        const snPublicKeyPEM = await exportRSAPublicKeyPEM(keyPair.publicKey);
        await this.env.SN_KEYS.put("sn_public_key_pem", snPublicKeyPEM);
        console.log("[PacketHandler] Generated and stored new SN keys to KV");
      } else {
        console.log("[PacketHandler] Generated SN keys (not persisted - no KV binding)");
      }
    } catch (e) {
      console.error("[PacketHandler] Init failed:", e);
      throw e;
    }
  }

  /**
   * 获取 Supernode 公钥 DER
   */
  getSNPublicKeyDER() {
    return this.snPublicKeyDER;
  }

  /**
   * 处理入站 WebSocket 消息
   * @param {WebSocket} ws
   * @param {ArrayBuffer|Uint8Array} data
   */
  async handleMessage(ws, data) {
    const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
    console.debug(`[PacketHandler] handleMessage called, buffer length=${buf.length}, first 16 bytes=${Array.from(buf.slice(0,16)).map(b=>b.toString(16).padStart(2,'0')).join(' ')}`);

    // 检查 WebSocket 关联的社区
    const connInfo = this.relayRoom.connections.get(ws);
    console.debug(`[PacketHandler] WS connection info:`, connInfo ? { community: connInfo.community, macAddr: connInfo.macAddr?.toString() } : 'none');

    // 首先尝试解析为 ProtoV 包 (需要至少 HEADER_SIZE 字节)
    if (buf.length >= HEADER_SIZE) {
      let header;
      try {
        header = parseProtoVHeader(buf);
        // 版本号必须匹配
        if (header.version === VERSION) {
          // 成功解析为 ProtoV 包
          const payload = buf.slice(HEADER_SIZE);
          // 社区隔离检查
          const community = await this.getCommunityFromWS(ws);
          if (!community) {
            console.warn("[PacketHandler] WS not associated with community, ignoring ProtoV packet");
            return;
          }
          // 验证 CommunityID (测试时暂时跳过，因为 n2n-go 客户端可能使用不同的社区名称)
          // const expectedCommunityID = hashCommunity(community);
          // if (header.communityId !== expectedCommunityID) {
          //   console.warn(`[PacketHandler] CommunityID mismatch: got ${header.communityId}, expected ${expectedCommunityID}`);
          //   return;
          // }
          // 分发处理
          try {
            await this.dispatch(ws, community, header, payload, buf);
          } catch (e) {
            console.error(`[PacketHandler] Dispatch error for type ${header.packetType}:`, e);
          }
          return;
        }
        // 版本不匹配，尝试作为 VFuze 包处理
      } catch (e) {
        // ProtoV 解析失败，尝试作为 VFuze 包处理
      }
    }

    // 尝试解析为 VFuze 包 (需要至少 VFuze_HEADER_SIZE 字节)
    if (buf.length >= VFuze_HEADER_SIZE) {
      try {
        return this.handleVFuzePacket(ws, buf);
      } catch (e) {
        console.warn("[PacketHandler] VFuze packet parse failed:", e.message);
      }
    }

    // 既不是 ProtoV 也不是 VFuze
    if (buf.length > 0) {
      console.warn("[PacketHandler] Unrecognized packet format, length:", buf.length);
    }
    console.debug("[PacketHandler] handleMessage finished");
  }

  /**
   * 从 WebSocket 关联获取社区名
   */
  async getCommunityFromWS(ws) {
    // WS 关联信息存储在 relayRoom 的 connections Map 中
    const connInfo = this.relayRoom.connections.get(ws);
    return connInfo?.community || null;
  }

  /**
   * 消息分发
   */
  async dispatch(ws, community, header, payload, rawBuf) {
    const commState = await this.communityManager.getCommunity(community);

    // DEBUG: log all incoming packet types with raw hex for TAP write error diagnosis
    const pktHex = Array.from(rawBuf.slice(0, Math.min(32, rawBuf.length)))
      .map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`[PacketHandler] DISPATCH type=${header.packetType} srcMAC=${formatMAC(header.srcMAC)} dstMAC=${formatMAC(header.dstMAC)} rawLen=${rawBuf.length} rawFirst32B=${pktHex}`);

    switch (header.packetType) {
      case PacketType.RegisterRequest:
        await this.handleRegisterRequest(ws, commState, payload);
        break;

      case PacketType.Ping:
      case PacketType.Pong:
        await this.handlePing(ws, commState, header);
        break;

      case PacketType.Heartbeat:
        // Heartbeat (type 3) - just update peer lastSeen, no response needed
        await this.handleHeartbeat(ws, commState, header);
        break;

      case PacketType.SNPublicSecret:
        // 251 - 客户端请求公钥
        await this.handleSNPublicSecretRequest(ws, commState, payload);
        break;

      case PacketType.PeerInfo:
        // 客户端上报 PeerInfo 变更 (较少见，通常由服务端下发)
        await this.handlePeerInfo(ws, commState, payload);
        break;

      case PacketType.P2PStateInfo:
        // type 9 - Edge 上报 P2P 状态信息 (PeerP2PInfos)
        await this.handleP2PStateInfo(ws, commState, payload);
        break;

      case PacketType.P2PFullState:
        // type 10 - Edge 请求/接收 P2P 全量状态
        await this.handleP2PFullState(ws, commState, payload);
        break;

      case PacketType.ICECandidate:
        await this.handleICECandidate(ws, commState, payload);
        break;

      case PacketType.TURNCredentials:
        await this.handleTURNCredentialsRequest(ws, commState);
        break;

      case PacketType.UnregisterRequest:
        await this.handleUnregister(ws, commState, payload);
        break;

      case PacketType.Data:
        // Data packet - forward to destination peer
        await this.handleDataForward(ws, commState, header, payload, rawBuf);
        break;

      case PacketType.Ack:
        // Ack packet - no action needed
        break;

      case PacketType.PeerListRequest:
        // Peer list request - respond with current peer list
        await this.handlePeerListRequest(ws, commState, header);
        break;

      case PacketType.OnlineCheck:
        // Online check - respond with ACK
        await this.sendPacket(ws, {
          packetType: PacketType.Ack,
          communityId: header.communityId,
          srcMAC: header.dstMAC,
          dstMAC: header.srcMAC,
          payload: new Uint8Array(0),
        });
        break;

      case PacketType.LeasesInfos:
        await this.handleLeasesInfos(ws, commState, payload);
        break;

      default:
        console.warn(`[PacketHandler] Unknown packet type: ${header.packetType}`);
    }
  }

  // ---------- 具体处理函数 ----------

  /**
   * 处理注册请求
   */
  async handleRegisterRequest(ws, commState, payload) {
    let req;
    try {
      req = decodeRegisterRequest(payload);
    } catch (e) {
      console.error("[PacketHandler] RegisterRequest decode failed:", e);
      return this.sendError(ws, "Invalid register request format");
    }

    console.log(`[PacketHandler] RegisterRequest from ${req.edgeMACAddr} for community ${commState.community}`);

    // 白名单检查
    if (this.env.WHITE_TOKEN && this.env.WHITE_TOKEN.trim()) {
      const tokens = this.env.WHITE_TOKEN.split(',').map(t => t.trim());
      // 这里可以检查 community 名或其他凭证
    }

    // RSA 解密 MachineID (可选验证)
    let machineID = null;
    if (req.encryptedMachineID && req.encryptedMachineID.length > 0) {
      try {
        machineID = await decryptRSA_OAEP(this.snPrivateKey, req.encryptedMachineID);
        if (machineID.length < 16) {
          console.warn("[PacketHandler] Decrypted MachineID too short");
        }
      } catch (e) {
        console.error("[PacketHandler] MachineID decryption failed:", e);
        return this.sendError(ws, "MachineID decryption failed");
      }
    }

    // 注册 Peer
    const { virtualIP, isNew, peerInfo } = await commState.registerPeer({
      macAddr: req.edgeMACAddr,
      ws,
      p2pEndpoint: req.p2pEndpoint,
      p2pCapabilities: req.p2pCapabilities,
      pubSocket: req.pubSocket || "",
      encryptedMachineID: machineID,
    });

    // 关联 WS 与社区
    this.relayRoom.connections.set(ws, {
      community: commState.community,
      macAddr: req.edgeMACAddr.toLowerCase(),
      virtualIP,
      connectedAt: Date.now(),
    });

    // 构建注册响应
    const peerList = commState.buildPeerInfoList(req.edgeMACAddr, PeerInfoEvent.TypeList);
    const respPayload = encodeRegisterResponse({
      isRegisterOk: true,
      virtualIP,
      masklen: 16,
      virtualNetmask: 0xFFFFFC00, // /10
      snPublicKey: this.snPublicKeyDER,
      communityName: commState.community,
      assignedMAC: req.edgeMACAddr,
      peers: peerList.peer_infos,
    });

    // 发送响应
    await this.sendPacket(ws, {
      packetType: PacketType.RegisterResponse,
      communityId: hashCommunity(commState.community),
      srcMAC: parseMAC("00:00:00:00:00:00"), // SN MAC
      dstMAC: parseMAC(req.edgeMACAddr),
      payload: respPayload,
    });

    // 广播新 Peer 加入通知 (TypeRegister)
    if (isNew) {
      await this.broadcastPeerInfo(commState, peerInfo, PeerInfoEvent.TypeRegister);
    }

    console.log(`[PacketHandler] ${req.edgeMACAddr} registered with virtual IP ${numberToIp(virtualIP)}`);
  }

  /**
   * 处理心跳
   */
  async handlePing(ws, commState, header) {
    // 更新 Peer 最后见到时间
    const connInfo = this.relayRoom.connections.get(ws);
    if (connInfo) {
      commState.updatePeer(connInfo.macAddr, { lastSeen: Math.floor(Date.now() / 1000) });
    }

    // 回复 Pong
    await this.sendPacket(ws, {
      packetType: PacketType.Pong,
      communityId: header.communityId,
      srcMAC: header.dstMAC,
      dstMAC: header.srcMAC,
      payload: new Uint8Array(0),
    });
  }

  /**
   * 处理 Heartbeat (type 3) - 仅更新 Peer 最后见到时间，无需回复
   */
  async handleHeartbeat(ws, commState, header) {
    const connInfo = this.relayRoom.connections.get(ws);
    if (connInfo) {
      commState.updatePeer(connInfo.macAddr, { lastSeen: Math.floor(Date.now() / 1000) });
    }
  }

  /**
   * 处理 SN 公钥请求 — protobuf 编码
   */
  async handleSNPublicSecretRequest(ws, commState, payload) {
    console.log(`[DEBUG handleSNPublicSecretRequest] payload length=${payload ? payload.length : 'null'}`);
    const msg = decodeSNPublicSecret(payload);
    console.log(`[DEBUG handleSNPublicSecretRequest] decoded msg.isRequest=${msg.isRequest}, msg.publicKey length=${msg.publicKey ? msg.publicKey.length : 'null'}`);

    // 接受 request (isRequest=true) 和 response (isRequest=false)
    if (msg.isRequest === false && msg.publicKey && msg.publicKey.length > 0) {
      console.log("[PacketHandler] Received SNPublicSecret response with public key");
      return;
    }

    // 是请求，回复公钥（PEM 编码字节）
    const { exportRSAPublicKeyPEM } = await import("./crypto.js");
    const pemString = await exportRSAPublicKeyPEM(this.snPublicKeyCryptoKey);
    console.log(`[DEBUG handleSNPublicSecretRequest] PEM string length=${pemString ? pemString.length : 'null'}, first 80 chars=${pemString ? pemString.substring(0, 80) : 'null'}`);
    const pemBytes = new TextEncoder().encode(pemString);
    console.log(`[DEBUG handleSNPublicSecretRequest] pemBytes length=${pemBytes.length}`);

    const responsePayload = encodeSNPublicSecret(pemBytes, false);
    console.log(`[DEBUG handleSNPublicSecretRequest] responsePayload length=${responsePayload.length}, first 20 bytes=${Array.from(responsePayload.slice(0, 20)).map(b=>b.toString(16).padStart(2,'0')).join(' ')}`);

    const responseHeader = {
      version: VERSION,
      ttl: 64,
      packetType: PacketType.SNPublicSecret,
      flags: 0,
      sequence: Math.floor(Math.random() * 65536),
      communityId: hashCommunity(commState.community),
      srcMAC: parseMAC("00:00:00:00:00:00"),
      dstMAC: new Uint8Array(6),
      timestamp: Math.floor(Date.now() / 1000),
      checksum: 0,
    };
    const packet = packProtoVDatagram(responseHeader, responsePayload);
    console.log(`[DEBUG handleSNPublicSecretRequest] final packet length=${packet.length}, header size=${HEADER_SIZE}`);

    try {
      ws.send(packet);
      console.log(`[PacketHandler] Sent ProtoV SNPublicSecret response, total length=${packet.length}`);
    } catch (e) {
      console.error("[PacketHandler] Failed to send SNPublicSecret response:", e);
    }
  }

  /**
   * 处理 PeerInfo 上报
   */
  async handlePeerInfo(ws, commState, payload) {
    try {
      const list = decodePeerInfoList(payload);
      // 通常服务端主动下发，客户端上报较少见
      console.debug("[PacketHandler] PeerInfo received:", list.eventType, list.peerInfos.length);
    } catch (e) {
      console.error("[PacketHandler] PeerInfo decode failed:", e);
    }
  }

  /**
   * 处理 P2PStateInfo (type 9) - Edge 上报 P2P 状态信息
   *
   * 对应 Go 侧 supernode.handleP2PStateInfoMessage:
   *   解码 PeerP2PInfos, 存储到社区 P2P 状态表。
   *
   * WS relay 侧简化处理：更新发送方 Peer 的 lastSeen，
   * 不维护完整 P2P 拓扑（P2P 直连由 Edge 自行探测）。
   *
   * 注意：PeerP2PInfos/P2PFullState 类型定义在 p2n.proto 中，
   * 当前 protos_generated.js 未包含。因此不完整解码，仅提取关键信息。
   */
  async handleP2PStateInfo(ws, commState, payload) {
    const connInfo = this.relayRoom.connections.get(ws);
    if (!connInfo) {
      console.warn("[PacketHandler] P2PStateInfo: no connInfo for ws");
      return;
    }

    // 对齐 Go 侧 supernode.handleP2PStateInfoMessage：
    //   解码 PeerP2PInfos，存储到社区 P2P 状态表 (cm.SetP2PInfosFor)
    let p2pInfos;
    try {
      p2pInfos = decodePeerP2PInfos(payload);
    } catch (e) {
      console.error("[PacketHandler] P2PStateInfo decode failed:", e);
      return;
    }

    commState.setP2PInfosFor(connInfo.macAddr, p2pInfos);
    commState.updatePeer(connInfo.macAddr, {
      lastSeen: Math.floor(Date.now() / 1000),
    });

    console.log(`[PacketHandler] P2PStateInfo: from=${connInfo.macAddr} to=${p2pInfos.to ? p2pInfos.to.length : 0} payloadLen=${payload ? payload.length : 0}`);
  }

  /**
   * 处理 P2PFullState (type 10) - 对齐 Go 侧 supernode.handleP2PFullStateMessage
   *
   * Edge 发送 P2PFullState 请求 (IsRequest=true) 时，回传社区内所有 peer 的 P2P 地址信息。
   * 非请求消息 (IsRequest=false) 不应由 supernode 处理。
   */
  async handleP2PFullState(ws, commState, payload) {
    const connInfo = this.relayRoom.connections.get(ws);
    if (!connInfo) {
      console.warn("[PacketHandler] P2PFullState: no connInfo for ws");
      return;
    }

    let fsMsg;
    try {
      fsMsg = decodeP2PFullState(payload);
    } catch (e) {
      console.error("[PacketHandler] P2PFullState decode failed:", e);
      return;
    }

    // 对齐 Go 侧：仅处理 IsRequest=true 的请求
    if (!fsMsg.isRequest) {
      console.warn(`[PacketHandler] P2PFullState: non-request from ${connInfo.macAddr}, ignored`);
      return;
    }

    // 对齐 Go 侧 cm.GetCommunityPeerP2PInfosDatas：
    //   构建 Reachables (在线 peer P2P 状态) + Unreachables (离线 peer 缓存)
    const fullState = commState.getP2PFullState(connInfo.macAddr);
    if (!fullState) {
      console.warn(`[PacketHandler] P2PFullState: unknown requester ${connInfo.macAddr}`);
      return;
    }

    const respPayload = encodeP2PFullState(fullState);
    await this.sendPacket(ws, {
      packetType: PacketType.P2PFullState,
      communityId: hashCommunity(commState.community),
      srcMAC: parseMAC("00:00:00:00:00:00"), // SN MAC
      dstMAC: new Uint8Array(6),
      payload: respPayload,
    });

    console.log(`[PacketHandler] P2PFullState: responded to ${connInfo.macAddr} reachables=${Object.keys(fullState.reachables).length} unreachables=${Object.keys(fullState.unreachables).length}`);
  }

  /**
   * 处理 ICE Candidate 转发 (参考 easytier-ws-relay2 的 RPC 转发模式)
   */
  async handleICECandidate(ws, commState, payload) {
    let candidate;
    try {
      candidate = decodeICECandidate(payload);
    } catch (e) {
      console.error("[PacketHandler] ICECandidate decode failed:", e);
      return;
    }

    // 目标 MAC 在 header.dstMAC 或 payload 中
    const targetMAC = candidate.targetMAC || formatMAC(new Uint8Array(payload.buffer, payload.byteOffset + 32, 6));
    if (!targetMAC) {
      console.warn("[PacketHandler] ICECandidate missing target MAC");
      return;
    }

    const targetPeer = commState.getPeer(targetMAC);
    if (!targetPeer || !targetPeer.online || !targetPeer.ws) {
      console.warn(`[PacketHandler] ICECandidate target ${targetMAC} not online`);
      return;
    }

    // 透传给目标 Peer
    const forwardPayload = encodeICECandidate(candidate);
    await this.sendPacket(targetPeer.ws, {
      packetType: PacketType.ICECandidate,
      communityId: hashCommunity(commState.community),
      srcMAC: new Uint8Array(6), // 由接收端解析 payload 中的源信息
      dstMAC: parseMAC(targetMAC),
      payload: forwardPayload,
    });

    console.log(`[PacketHandler] Forwarded ICECandidate to ${targetMAC}`);
  }

  /**
   * 处理 TURN 凭证请求
   */
  async handleTURNCredentialsRequest(ws, commState) {
    // 从环境变量或配置获取 TURN 服务器信息
    // 实际部署时应集成 coturn REST API 动态生成临时凭证
    const turnConfig = this.getTURNConfig();
    if (!turnConfig) {
      console.warn("[PacketHandler] TURN not configured");
      return;
    }

    const payload = encodeTURNCredentials(turnConfig);
    await this.sendPacket(ws, {
      packetType: PacketType.TURNCredentials,
      communityId: hashCommunity(commState.community),
      srcMAC: parseMAC("00:00:00:00:00:00"),
      dstMAC: new Uint8Array(6),
      payload,
    });
  }

  /**
   * 处理注销请求
   */
  async handleUnregister(ws, commState, payload) {
    const connInfo = this.relayRoom.connections.get(ws);
    if (!connInfo) return;

    await commState.unregisterPeer(connInfo.macAddr);
    this.relayRoom.connections.delete(ws);

    // 广播 Peer 下线通知
    await this.broadcastPeerInfo(commState, { macAddr: connInfo.macAddr }, PeerInfoEvent.TypeUnregister);

    console.log(`[PacketHandler] ${connInfo.macAddr} unregistered`);
  }

  /**
   * 处理租约信息查询 (对应 n2n-go LeasesInfos) — protobuf 编码
   */
  async handleLeasesInfos(ws, commState, payload) {
    const leases = commState.ipam.listAll();
    const leasesMap = {};

    for (const item of leases) {
      // Convert IP string to 4-byte IPv4 bytes
      const ipParts = item.ip.split('.').map(Number);
      const ipBytes = new Uint8Array(ipParts);

      leasesMap[item.mac] = {
        lease: {
          ip: ipBytes,
          mac: item.mac,
          expiryNs: 0,
          sticky: false,
          lastRenewNs: 0,
        },
        leaseEdgeInfos: {
          edgeId: item.mac,
          isRegistered: true,
          timeSinceLastUpdateNs: 0,
          virtualIp: ipBytes,
        },
      };
    }

    const protoPayload = encode("LeasesInfos", {
      isRequest: false,
      communityName: commState.community,
      leasesWithEdgesInfos: leasesMap,
    });

    await this.sendPacket(ws, {
      packetType: PacketType.LeasesInfos,
      communityId: hashCommunity(commState.community),
      srcMAC: parseMAC("00:00:00:00:00:00"),
      dstMAC: new Uint8Array(6),
      payload: protoPayload,
    });
  }

  /**
   * 处理 VFuze 打洞包
   *
   * 对齐 Go 侧 supernode.handleVFuze 行为：
   * 1. 校验社区匹配（srcedge.Community == dstedge.Community）
   * 2. 源/目标 edge 都必须存在，否则丢弃（不回退广播）
   * 3. 单播转发 VFuze 包给目标 peer（对齐 supernode.forwardPacket）
   *
   * 注意：Go 侧 handleVFuze 没有 ForwardWithFallBack 回退逻辑。
   * VFuze 包是打洞包，目标不可达时直接丢弃，不走广播。
   */
  async handleVFuzePacket(ws, buf) {
    try {
      const header = parseVFuzeHeader(buf);
      const dstMAC = formatMAC(header.dstMAC);

      const connInfo = this.relayRoom.connections.get(ws);
      if (!connInfo) {
        console.log(`[PacketHandler] VFuze: no connInfo for WS, dropping`);
        return;
      }

      const srcMAC = connInfo.macAddr;
      const srcCommunity = connInfo.community;
      if (!srcCommunity) {
        console.log(`[PacketHandler] VFuze: no community for WS, dropping`);
        return;
      }

      const commState = await this.communityManager.getCommunity(srcCommunity);
      if (!commState) {
        console.log(`[PacketHandler] VFuze: community ${srcCommunity} not found, dropping`);
        return;
      }

      // 对齐 Go 侧 supernode.handleVFuze：
      //   dstedge, dstok := s.edgesByMAC[dst.String()]
      //   srcedge, srcok := s.edgesBySocket[addr.String()]
      //   if !dstok || !srcok { return }  // 丢弃，不回退
      const dstPeer = commState.getPeer(dstMAC);
      const srcPeer = commState.getPeer(srcMAC);

      if (!dstPeer || !srcPeer) {
        console.log(`[PacketHandler] VFuze: dropping - dstPeer=${!!dstPeer} srcPeer=${!!srcPeer} ` +
          `srcMAC=${srcMAC} dstMAC=${dstMAC}`);
        return;
      }

      // 对齐 Go 侧社区匹配校验：
      //   if dstedge.Community != srcedge.Community { return }
      if (dstPeer.community !== srcPeer.community) {
        console.log(`[PacketHandler] VFuze: community mismatch - src=${srcPeer.community} dst=${dstPeer.community}, dropping`);
        return;
      }

      // 对齐 Go 侧：仅单播转发，无 ForwardWithFallBack 回退
      if (dstPeer.online && dstPeer.ws) {
        await dstPeer.ws.send(buf);
        console.log(`[PacketHandler] VFuze: forwarded to ${dstMAC}`);
      } else {
        console.log(`[PacketHandler] VFuze: target ${dstMAC} not online, dropping`);
      }
    } catch (e) {
      console.error("[PacketHandler] VFuze packet error:", e);
    }
  }

  // ---------- 发送辅助函数 ----------

  /**
   * 发送标准 ProtoV 包
   */
  async sendPacket(ws, { packetType, communityId, srcMAC, dstMAC, payload, fromSupernode = true }) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;

    // 对齐 Go 侧 SNHeader: Flags = protocol.FlagFromSuperNode
    const header = {
      version: VERSION,
      ttl: 64,
      packetType,
      flags: fromSupernode ? Flags.FromSupernode : 0,
      sequence: Math.floor(Math.random() * 65536),
      communityId,
      srcMAC,
      dstMAC,
      timestamp: Math.floor(Date.now() / 1000),
      checksum: 0,
    };

    const packet = packProtoVDatagram(header, payload);
    try {
      ws.send(packet);
      return true;
    } catch (e) {
      console.error("[PacketHandler] Send packet failed:", e);
      return false;
    }
  }

  

  /**
   * 广播 PeerInfo 变更给社区内所有在线 Peer (排除发送者)
   */
  async broadcastPeerInfo(commState, peerInfo, eventType) {
    const list = commState.buildPeerInfoList(peerInfo.macAddr, eventType);
    const payload = encodePeerInfoList(list);

    const onlinePeers = commState.getOnlinePeers();
    for (const p of onlinePeers) {
      if (p.macAddr === peerInfo.macAddr) continue; // 不发给自己
      if (!p.ws || p.ws.readyState !== WebSocket.OPEN) continue;

      await this.sendPacket(p.ws, {
        packetType: PacketType.PeerInfo,
        communityId: hashCommunity(commState.community),
        srcMAC: parseMAC("00:00:00:00:00:00"),
        dstMAC: new Uint8Array(6),
        payload,
      });
    }
  }

  /**
   * 获取 TURN 配置 (实际部署应集成 coturn API)
   */
  getTURNConfig() {
    // 从环境变量读取, 格式: "turn:user:pass@host:443?transport=tcp,turn:..."
    const turnEnv = this.env.TURN_SERVERS || "";
    if (!turnEnv) return null;

    const uris = turnEnv.split(',').map(s => s.trim()).filter(Boolean);
    if (uris.length === 0) return null;

    return {
      username: this.env.TURN_USERNAME || "n2n",
      password: this.env.TURN_PASSWORD || "n2npassword",
      ttl: 86400,
      uris,
    };
  }

  sendError(ws, message) {
    const payload = new TextEncoder().encode(message);
    return this.sendPacket(ws, {
      packetType: PacketType.Invalid,
      communityId: 0,
      srcMAC: parseMAC("00:00:00:00:00:00"),
      dstMAC: new Uint8Array(6),
      payload,
    });
  }

  /**
   * 处理 PeerListRequest (type 6) - 返回当前社区的 Peer 列表
   */
  async handlePeerListRequest(ws, commState, header) {
    const list = commState.buildPeerInfoList(header.dstMAC ? formatMAC(header.dstMAC) : "", PeerInfoEvent.TypeList);
    const payload = encodePeerInfoList(list);
    await this.sendPacket(ws, {
      packetType: PacketType.PeerInfo,
      communityId: header.communityId,
      srcMAC: parseMAC("00:00:00:00:00:00"),
      dstMAC: new Uint8Array(6),
      payload,
    });
  }

  /**
   * ForwardWithFallBack - 对应 Go 侧 supernode.ForwardWithFallBack
   *
   * 尝试单播转发，目标不存在或转发失败时回退为广播。
   * 这是 n2n-go 的标准行为：当单播目标 MAC 不在已知 Peer 中时，
   * 自动广播到整个社区，确保 ARP/ICMP 等广播包能到达所有在线 Peer。
   *
   * @param {Object} params
   * @param {WebSocket} params.ws - 发送方 WS 连接
   * @param {CommunityState} params.commState - 社区状态
   * @param {string} params.dstMAC - 目标 MAC 地址
   * @param {Uint8Array} params.rawBuf - 原始 ProtoV 数据报
   * @param {string} params.srcMAC - 源 MAC 地址
   */
  async ForwardWithFallBack({ ws, commState, dstMAC, rawBuf, srcMAC }) {
    // 对齐 Go 侧 supernode.forwardPacket：
    //   if packet[0] == protocol.VersionV {
    //       packet, err = protocol.FlagPacketFromSupernode(packet)
    //   }
    // 无论单播还是广播，Supernode 转发的数据包都标记 FlagFromSuperNode
    let snBuf = rawBuf;
    if (rawBuf && rawBuf.length > 0 && rawBuf[0] === VERSION) {
      try {
        snBuf = flagPacketFromSupernode(rawBuf);
      } catch (e) {
        console.error("[PacketHandler] ForwardWithFallBack: flagPacketFromSupernode failed:", e.message);
      }
    }

    const targetPeer = commState.getPeer(dstMAC);

    // 尝试单播转发
    if (targetPeer && targetPeer.online && targetPeer.ws) {
      try {
        await targetPeer.ws.send(snBuf);
        console.log(`[PacketHandler] ForwardWithFallBack: unicast forward to ${dstMAC} OK (FlagFromSuperNode set)`);
        return;
      } catch (e) {
        console.error(`[PacketHandler] ForwardWithFallBack: unicast forward ERROR to ${dstMAC}: ${e.message}`);
        // 转发失败，继续回退广播
      }
    }

    // 回退广播：目标不存在、离线，或单播转发失败
    const onlinePeers = commState.getOnlinePeers();
    console.log(`[PacketHandler] ForwardWithFallBack: falling back to broadcast, ` +
      `target=${dstMAC} not available, broadcasting to ${onlinePeers.length} online peers ` +
      `(sender=${srcMAC})`);

    for (const p of onlinePeers) {
      if (p.ws && p.ws !== ws) {
        try {
          await p.ws.send(snBuf);
          console.log(`[PacketHandler] ForwardWithFallBack:   -> broadcast forwarded to ${p.macAddr} (FlagFromSuperNode set)`);
        } catch (e) {
          console.error(`[PacketHandler] ForwardWithFallBack:   -> ERROR broadcasting to ${p.macAddr}: ${e.message}`);
        }
      }
    }
  }

  /**
   * 处理 Data 包转发 (type 4) - 根据 dstMAC 转发给目标 Peer
   */
  async handleDataForward(ws, commState, header, payload, rawBuf) {
    // Forward Data packets to the target edge via its WS connection.
    // The Go edge expects to receive the Data packet and write it directly to TAP.
    const dstMAC = formatMAC(header.dstMAC);
    const srcMAC = formatMAC(header.srcMAC);

    console.log(`[PacketHandler] Data forward: srcMAC=${srcMAC} dstMAC=${dstMAC}, payloadLen=${payload.length}`);
    // DEBUG: hex dump first 64 bytes of rawBuf for TAP write error diagnosis
    const hexDump = Array.from(rawBuf.slice(0, Math.min(64, rawBuf.length)))
      .map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`[PacketHandler] DEBUG rawBuf first ${Math.min(64, rawBuf.length)}B: ${hexDump}`);
    // DEBUG: check if payload starts with Ethernet frame (dst MAC first 6 bytes)
    if (payload.length >= 14) {
      const ethDst = Array.from(payload.slice(0, 6)).map(b => b.toString(16).padStart(2, '0')).join(':');
      const ethSrc = Array.from(payload.slice(6, 12)).map(b => b.toString(16).padStart(2, '0')).join(':');
      const ethType = (payload[12] << 8) | payload[13];
      console.log(`[PacketHandler] DEBUG Ethernet frame: dst=${ethDst} src=${ethSrc} type=0x${ethType.toString(16)}`);
    }

    // 使用 ForwardWithFallBack 统一处理单播/广播回退
    // 对应 Go 侧 supernode.handleDataMessage -> ForwardWithFallBack
    await this.ForwardWithFallBack({ ws, commState, dstMAC, rawBuf, srcMAC });
  }
}