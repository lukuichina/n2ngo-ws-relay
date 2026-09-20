/**
 * 社区状态上下文管理
 * 对应 vnts-cf 的 AppCache，管理每个社区的：
 * - IPAM (虚拟 IP 分配)
 * - Peer 注册表 (在线/离线 Peer 信息)
 * - 网络配置
 * - 持久化序列化/反序列化
 */

import { IPAM } from "./ipam.js";
import { numberToIp } from "./constants.js";

export class CommunityState {
  constructor(community, relayRoom, networkConfig) {
    this.community = community;
    this.relayRoom = relayRoom;
    this.ipam = new IPAM(relayRoom.state.storage, community, networkConfig);

    // Peer 注册表: macAddr -> PeerInfo
    this.peers = new Map();

    // P2P 状态表: macAddr -> PeerP2PInfos (reachables)
    // 对应 Go 侧 Community.communityPeerP2PInfos
    this.p2pInfos = new Map();

    // 待广播的 Peer 变更队列
    this.pendingPeerUpdates = [];

    // 社区配置
    this.config = {
      allowP2P: true,
      disableRelay: false,
      mtu: 1280,
      encryption: false,
    };

    // 统计信息
    this.stats = {
      totalRegistrations: 0,
      currentOnline: 0,
      totalTrafficRx: 0,
      totalTrafficTx: 0,
      createdAt: Date.now(),
    };
  }

  /**
   * 从存储加载状态
   */
  async load() {
    await this.ipam.load();

    // 加载 Peer 状态 (仅在线 Peer 需恢复 WS 连接，离线 Peer 保留 IP 分配)
    try {
      const data = await this.relayRoom.state.storage.get(`community:${this.community}`);
      if (data) {
        this.config = { ...this.config, ...data.config };
        this.stats = { ...this.stats, ...data.stats };

        // 恢复所有 Peer 记录 (保留 IP 分配)
        // DO 重建后所有 WebSocket 连接已断开，所有 Peer 标记为离线
        if (data.peers) {
          for (const [mac, peer] of Object.entries(data.peers)) {
            this.peers.set(mac, { ...peer, ws: null, online: false });
          }
        }
      }
    } catch (e) {
      console.error(`[Community-${this.community}] Load failed:`, e);
    }
  }

  /**
   * 持久化社区状态
   */
  async save() {
    try {
      const peersData = {};
      for (const [mac, peer] of this.peers) {
        // 不保存 WS 连接对象
        const { ws, ...peerData } = peer;
        peersData[mac] = peerData;
      }

      await this.relayRoom.state.storage.put(`community:${this.community}`, {
        config: this.config,
        stats: this.stats,
        peers: peersData,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.error(`[Community-${this.community}] Save failed:`, e);
    }
  }

  /**
   * 注册新 Peer 或更新现有 Peer
   * @param {Object} params
   * @returns {Object} { virtualIP, isNew, peerInfo }
   */
  async registerPeer(params) {
    const { macAddr, ws, p2pEndpoint, p2pCapabilities, pubSocket, encryptedMachineID } = params;
    const normalizedMAC = macAddr.toLowerCase();

    // 分配虚拟 IP
    const virtualIP = await this.ipam.allocate(normalizedMAC);

    const isNew = !this.peers.has(normalizedMAC);
    const now = Math.floor(Date.now() / 1000);

    const peerInfo = {
      macAddr: normalizedMAC,
      virtualIP,
      ws,
      online: true,
      p2pEndpoint: p2pEndpoint || "",
      p2pCapabilities: p2pCapabilities || [],
      pubSocket: pubSocket || "",
      natType: "unknown",
      lastSeen: now,
      registeredAt: now,
      encryptedMachineID: encryptedMachineID ? Array.from(encryptedMachineID) : [],
    };

    this.peers.set(normalizedMAC, peerInfo);

    if (isNew) {
      this.stats.totalRegistrations++;
    }
    this.stats.currentOnline = this.countOnline();

    await this.save();
    return { virtualIP, isNew, peerInfo };
  }

  /**
   * Peer 断线/下线
   * @param {string} macAddr
   */
  async unregisterPeer(macAddr) {
    const normalizedMAC = macAddr.toLowerCase();
    const peer = this.peers.get(normalizedMAC);
    if (!peer) return false;

    peer.online = false;
    peer.ws = null;
    peer.lastSeen = Math.floor(Date.now() / 1000);
    this.stats.currentOnline = this.countOnline();

    await this.save();
    return true;
  }

  /**
   * 更新 Peer 信息 (心跳、P2P 端点变更等)
   */
  updatePeer(macAddr, updates) {
    const normalizedMAC = macAddr.toLowerCase();
    const peer = this.peers.get(normalizedMAC);
    if (!peer) return false;

    Object.assign(peer, updates, { lastSeen: Math.floor(Date.now() / 1000) });
    // 持久化更新，防止 DO 重建后状态丢失
    this.save().catch(e => console.error(`[Community-${this.community}] Save after updatePeer failed:`, e));
    return true;
  }

  /**
   * 获取 Peer 信息
   */
  getPeer(macAddr) {
    return this.peers.get(macAddr.toLowerCase());
  }

  /**
   * 获取所有在线 Peer
   */
  getOnlinePeers() {
    const result = [];
    for (const [mac, peer] of this.peers) {
      if (peer.online) result.push(peer);
    }
    return result;
  }

  /**
   * 获取所有 Peer (含离线)
   */
  getAllPeers() {
    return Array.from(this.peers.values());
  }

  /**
   * 根据虚拟 IP 查找 Peer
   */
  getPeerByVirtualIP(virtualIP) {
    for (const peer of this.peers.values()) {
      if (peer.virtualIP === virtualIP) return peer;
    }
    return null;
  }

  /**
   * 在线 Peer 数量
   */
  countOnline() {
    let count = 0;
    for (const peer of this.peers.values()) {
      if (peer.online) count++;
    }
    return count;
  }

  /**
   * 设置/更新 P2P 状态信息 (PeerP2PInfos)
   * 对应 Go 侧 Community.SetP2PInfosFor
   * @param {string} edgeMacADDR
   * @param {Object} infos - PeerP2PInfos { from, to }
   */
  setP2PInfosFor(edgeMacADDR, infos) {
    const normalizedMAC = edgeMacADDR.toLowerCase();
    const peer = this.peers.get(normalizedMAC);
    if (!peer) {
      console.warn(`[Community-${this.community}] setP2PInfosFor: unknown edge ${normalizedMAC}`);
      return false;
    }
    this.p2pInfos.set(normalizedMAC, infos);
    return true;
  }

  /**
   * 获取社区 P2P 全量状态
   * 对应 Go 侧 Community.GetCommunityPeerP2PInfosDatas
   * @param {string} reqMACAddr - 请求者 MAC
   * @returns {Object} P2PFullState { communityName, isRequest, reachables, unreachables }
   */
  getP2PFullState(reqMACAddr) {
    const normalizedMAC = reqMACAddr.toLowerCase();
    const peer = this.peers.get(normalizedMAC);
    if (!peer) {
      return null;
    }

    // Reachables: 当前在线 peer 的 P2P 状态
    const reachables = {};
    for (const [mac, p] of this.peers) {
      if (!p.online) continue;
      const p2pInfo = this.p2pInfos.get(mac);
      if (p2pInfo) {
        reachables[mac] = p2pInfo;
      }
    }

    // Unreachables: 离线 peer 缓存信息
    const unreachables = {};
    for (const [mac, p] of this.peers) {
      if (p.online) continue;
      unreachables[mac] = {
        desc: p.desc || "",
        macAddr: p.macAddr || mac,
        virtualIp: typeof p.virtualIP === 'number' ? numberToIp(p.virtualIP) : (p.virtualIP || ""),
        community: this.community,
        lastUpdateNs: 0,
      };
    }

    return {
      communityName: this.community,
      isRequest: false,
      reachables,
      unreachables,
    };
  }

  /**
   * 构建 PeerInfoList (用于下发给客户端)
   * 返回 protobuf 格式的对象，字段名与 proto 定义一致
   * @param {string} [originMAC] - 请求者 MAC (用于填充 Origin 字段)
   * @param {number} eventType - 事件类型
   * @returns {Object}
   */
  buildPeerInfoList(originMAC, eventType = 0) {
    const peers = this.getOnlinePeers();
    const peerInfos = peers.map(p => {
      const virtualIPStr = typeof p.virtualIP === 'number'
        ? numberToIp(p.virtualIP)
        : p.virtualIP;
      let pubSocketObj = null;
      if (p.pubSocket) {
        if (typeof p.pubSocket === 'string') {
          const lastColon = p.pubSocket.lastIndexOf(':');
          if (lastColon > 0) {
            pubSocketObj = {
              ip: p.pubSocket.substring(0, lastColon),
              port: parseInt(p.pubSocket.substring(lastColon + 1)) || 0,
            };
          }
        } else if (typeof p.pubSocket === 'object') {
          pubSocketObj = p.pubSocket;
        }
      }
      return {
        mac_addr: p.macAddr,
        virtual_ip: virtualIPStr,
        pub_socket: pubSocketObj,
        p2p_endpoint: this.config.allowP2P && !this.config.disableRelay ? p.p2pEndpoint : "",
        nat_type: p.natType || "unknown",
        last_seen: p.lastSeen || Math.floor(Date.now() / 1000),
        p2p_capabilities: p.p2pCapabilities || [],
      };
    });

    let origin = null;
    let hasOrigin = false;
    if (originMAC) {
      const originPeer = this.peers.get(originMAC.toLowerCase());
      if (originPeer) {
        const originVipStr = typeof originPeer.virtualIP === 'number'
          ? numberToIp(originPeer.virtualIP)
          : originPeer.virtualIP;
        let originPubSocketObj = null;
        if (originPeer.pubSocket) {
          if (typeof originPeer.pubSocket === 'string') {
            const lastColon = originPeer.pubSocket.lastIndexOf(':');
            if (lastColon > 0) {
              originPubSocketObj = {
                ip: originPeer.pubSocket.substring(0, lastColon),
                port: parseInt(originPeer.pubSocket.substring(lastColon + 1)) || 0,
              };
            }
          } else if (typeof originPeer.pubSocket === 'object') {
            originPubSocketObj = originPeer.pubSocket;
          }
        }
        origin = {
          mac_addr: originPeer.macAddr,
          virtual_ip: originVipStr,
          pub_socket: originPubSocketObj,
          p2p_endpoint: this.config.allowP2P && !this.config.disableRelay ? originPeer.p2pEndpoint : "",
          nat_type: originPeer.natType || "unknown",
          last_seen: originPeer.lastSeen || Math.floor(Date.now() / 1000),
          p2p_capabilities: originPeer.p2pCapabilities || [],
        };
        hasOrigin = true;
      }
    }

    return {
      origin,
      has_origin: hasOrigin,
      peer_infos: peerInfos,
      event_type: eventType,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.save();
  }
}

/**
 * 多社区状态管理器
 */
export class CommunityManager {
  constructor(relayRoom) {
    this.relayRoom = relayRoom;
    this.communities = new Map(); // communityName -> CommunityState
  }

  async getCommunity(name) {
    let community = this.communities.get(name);
    if (!community) {
      community = new CommunityState(name, this.relayRoom, this.relayRoom.networkConfig);
      await community.load();
      this.communities.set(name, community);
    }
    return community;
  }

  async registerPeer(communityName, params) {
    const community = await this.getCommunity(communityName);
    return community.registerPeer(params);
  }

  async unregisterPeer(communityName, macAddr) {
    const community = this.communities.get(communityName);
    if (community) {
      return community.unregisterPeer(macAddr);
    }
    return false;
  }

  getAllCommunities() {
    return Array.from(this.communities.keys());
  }

  async saveAll() {
    for (const community of this.communities.values()) {
      await community.save();
    }
  }
}