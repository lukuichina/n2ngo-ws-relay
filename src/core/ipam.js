/**
 * IP Address Management (IPAM) for n2n-go virtual IPs
 * 对应 n2n-go 的 Lease 管理和虚拟 IP 分配逻辑
 * 默认网段：100.64.0.0/16 (CGNAT) -> 100.64.0.1 - 100.64.255.254
 */

import {
  numberToIp,
  ipToNumber,
} from "./constants.js";

/**
 * 解析 CIDR 字符串为网段参数
 * @param {string} cidr - 如 "100.64.0.0/16"
 * @returns {{base: number, mask: number, start: number, end: number}} 或 null
 */
export function parseCIDR(cidr) {
  const parts = cidr.split('/');
  if (parts.length !== 2) return null;
  const base = ipToNumber(parts[0]);
  const prefixLen = parseInt(parts[1], 10);
  if (isNaN(base) || isNaN(prefixLen) || prefixLen < 0 || prefixLen > 32) return null;

  // 计算掩码：高 prefixLen 位为 1
  const mask = prefixLen === 0 ? 0xFFFFFFFF : (~0 << (32 - prefixLen)) >>> 0;
  // 网络地址 = base & mask
  const networkBase = (base & mask) >>> 0;
  // 广播地址 = networkBase | ~mask
  const broadcast = (networkBase | (~mask & 0xFFFFFFFF)) >>> 0;
  // 可用起始 = networkBase + 1（跳过网络地址）
  const start = networkBase + 1;
  // 可用结束 = broadcast - 1（跳过广播地址）
  const end = broadcast - 1;

  return { base: networkBase, mask, start, end };
}

export class IPAM {
  constructor(storage, community, networkConfig) {
    this.storage = storage;
    this.community = community;
    this.key = `ipam:${community}`;
    this.allocations = new Map(); // macAddr -> ipNumber
    this.reverse = new Map();     // ipNumber -> macAddr

    // 网段配置：优先使用传入的 networkConfig (CIDR 字符串)，否则使用默认常量
    const cfg = networkConfig || {};
    if (cfg.cidr) {
      const parsed = parseCIDR(cfg.cidr);
      if (parsed) {
        this.networkBase = parsed.base;
        this.networkMask = parsed.mask;
        this.networkStart = parsed.start;
        this.networkEnd = parsed.end;
      } else {
        throw new Error(`Invalid CIDR: ${cfg.cidr}`);
      }
    } else {
      this.networkBase = cfg.networkBase != null ? cfg.networkBase : VIRTUAL_NETWORK_BASE;
      this.networkMask = cfg.networkMask != null ? cfg.networkMask : VIRTUAL_NETWORK_MASK;
      this.networkStart = cfg.networkStart != null ? cfg.networkStart : VIRTUAL_NETWORK_START;
      this.networkEnd = cfg.networkEnd != null ? cfg.networkEnd : VIRTUAL_NETWORK_END;
    }

    this.nextCandidate = this.networkStart;
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
        this.nextCandidate = data.nextCandidate || this.networkStart;
        // 校验 nextCandidate 有效性
        if (this.nextCandidate < this.networkStart || this.nextCandidate > this.networkEnd) {
          this.nextCandidate = this.networkStart;
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
      if (this.nextCandidate > this.networkEnd) {
        this.nextCandidate = this.networkStart; // 回绕
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
      poolSize: this.networkEnd - this.networkStart + 1,
      nextCandidate: this.nextCandidate,
      usagePercent: ((this.allocations.size / (this.networkEnd - this.networkStart + 1)) * 100).toFixed(2),
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