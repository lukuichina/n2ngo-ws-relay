/**
 * IP Address Management (IPAM) for n2n-go virtual IPs
 * 对应 n2n-go 的 Lease 管理和虚拟 IP 分配逻辑
 * 网段：100.64.0.0/10 (CGNAT) -> 100.64.0.1 - 100.127.255.254
 */

import {
  VIRTUAL_NETWORK_BASE,
  VIRTUAL_NETWORK_MASK,
  VIRTUAL_NETWORK_START,
  VIRTUAL_NETWORK_END,
  numberToIp,
  ipToNumber,
} from "./constants.js";

export class IPAM {
  constructor(storage, community) {
    this.storage = storage;
    this.community = community;
    this.key = `ipam:${community}`;
    this.allocations = new Map(); // macAddr -> ipNumber
    this.reverse = new Map();     // ipNumber -> macAddr
    this.nextCandidate = VIRTUAL_NETWORK_START;
  }

  /**
   * 从持久化存储加载分配表
   */
  async load() {
    try {
      const data = await this.storage.get(this.key);
      if (data) {
        this.allocations = new Map(Object.entries(data.allocations || {}).map(([k, v]) => [k, Number(v)]));
        this.reverse = new Map(Object.entries(data.reverse || {}).map(([k, v]) => [Number(k), v]));
        this.nextCandidate = data.nextCandidate || VIRTUAL_NETWORK_START;
        // 校验 nextCandidate 有效性
        if (this.nextCandidate < VIRTUAL_NETWORK_START || this.nextCandidate > VIRTUAL_NETWORK_END) {
          this.nextCandidate = VIRTUAL_NETWORK_START;
        }
      }
    } catch (e) {
      console.error(`[IPAM-${this.community}] Load failed:`, e);
    }
  }

  /**
   * 持久化分配表
   */
  async save() {
    try {
      await this.storage.put(this.key, {
        allocations: Object.fromEntries(this.allocations),
        reverse: Object.fromEntries(this.reverse),
        nextCandidate: this.nextCandidate,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.error(`[IPAM-${this.community}] Save failed:`, e);
    }
  }

  /**
   * 分配虚拟 IP 给指定 MAC
   * @param {string} macAddr - MAC 地址 (格式: aa:bb:cc:dd:ee:ff)
   * @returns {number} 分配的 IP 整数 (大端序)
   */
  async allocate(macAddr) {
    const normalized = macAddr.toLowerCase();

    // 已有分配直接返回
    if (this.allocations.has(normalized)) {
      return this.allocations.get(normalized);
    }

    // 寻找下一个可用 IP
    let attempts = 0;
    const maxAttempts = 10000; // 防止死循环
    while (attempts < maxAttempts) {
      if (this.nextCandidate > VIRTUAL_NETWORK_END) {
        this.nextCandidate = VIRTUAL_NETWORK_START; // 回绕
      }
      if (!this.reverse.has(this.nextCandidate)) {
        break;
      }
      this.nextCandidate++;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error(`[IPAM-${this.community}] No available IP addresses in pool`);
    }

    const ip = this.nextCandidate;
    this.allocations.set(normalized, ip);
    this.reverse.set(ip, normalized);
    this.nextCandidate++;

    await this.save();
    console.log(`[IPAM-${this.community}] Allocated ${numberToIp(ip)} to ${normalized}`);
    return ip;
  }

  /**
   * 释放 MAC 对应的 IP
   * @param {string} macAddr
   * @returns {boolean} 是否成功释放
   */
  async release(macAddr) {
    const normalized = macAddr.toLowerCase();
    const ip = this.allocations.get(normalized);
    if (ip === undefined) {
      return false;
    }
    this.allocations.delete(normalized);
    this.reverse.delete(ip);
    await this.save();
    console.log(`[IPAM-${this.community}] Released ${numberToIp(ip)} from ${normalized}`);
    return true;
  }

  /**
   * 查询 MAC 对应的 IP
   * @param {string} macAddr
   * @returns {number|undefined} IP 整数
   */
  get(macAddr) {
    return this.allocations.get(macAddr.toLowerCase());
  }

  /**
   * 查询 IP 对应的 MAC
   * @param {number} ipNumber
   * @returns {string|undefined} MAC 地址
   */
  getMAC(ipNumber) {
    return this.reverse.get(ipNumber);
  }

  /**
   * 检查 IP 是否已分配
   * @param {number} ipNumber
   * @returns {boolean}
   */
  hasIP(ipNumber) {
    return this.reverse.has(ipNumber);
  }

  /**
   * 获取当前分配统计
   * @returns {Object}
   */
  stats() {
    return {
      community: this.community,
      allocated: this.allocations.size,
      poolSize: VIRTUAL_NETWORK_END - VIRTUAL_NETWORK_START + 1,
      nextCandidate: this.nextCandidate,
      usagePercent: ((this.allocations.size / (VIRTUAL_NETWORK_END - VIRTUAL_NETWORK_START + 1)) * 100).toFixed(2),
    };
  }

  /**
   * 获取所有分配记录（用于 /room 页面展示）
   * @returns {Array}
   */
  listAll() {
    const result = [];
    for (const [mac, ip] of this.allocations) {
      result.push({
        mac,
        ip: numberToIp(ip),
        ipNumber: ip,
      });
    }
    return result;
  }
}

/**
 * 多社区 IPAM 管理器
 */
export class IPAMManager {
  constructor(storage) {
    this.storage = storage;
    this.ipams = new Map(); // community -> IPAM
  }

  async getIPAM(community) {
    let ipam = this.ipams.get(community);
    if (!ipam) {
      ipam = new IPAM(this.storage, community);
      await ipam.load();
      this.ipams.set(community, ipam);
    }
    return ipam;
  }

  async allocate(community, macAddr) {
    const ipam = await this.getIPAM(community);
    return ipam.allocate(macAddr);
  }

  async release(community, macAddr) {
    const ipam = this.ipams.get(community);
    if (ipam) {
      return ipam.release(macAddr);
    }
    return false;
  }

  get(community, macAddr) {
    const ipam = this.ipams.get(community);
    return ipam?.get(macAddr);
  }
}