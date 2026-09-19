/**
 * Protobuf 类型注册层
 *
 * 封装 protos_generated.js，提供统一的类型查找接口。
 * 所有消息类型的 encode/decode 操作通过此模块进行。
 *
 * 对应 Go 侧：n2n-go/pkg/protocol/netstruct/ 中的 proto 消息类型
 */

import $root from "./protos_generated.js";

// 消息类型注册表 —— 直接引用生成的类型对象
const types = {
  SnPublicSecret:     $root.n2n.SnPublicSecret,
  RegisterRequest:    $root.n2n.RegisterRequest,
  RegisterResponse:   $root.n2n.RegisterResponse,
  PeerInfo:           $root.n2n.PeerInfo,
  PeerInfoList:       $root.n2n.PeerInfoList,
  ICECandidate:       $root.n2n.ICECandidate,
  TURNCredentials:    $root.n2n.TURNCredentials,
  IppoolLease:        $root.n2n.IppoolLease,
  LeaseEdgeInfos:     $root.n2n.LeaseEdgeInfos,
  LeaseWithEdgeInfos: $root.n2n.LeaseWithEdgeInfos,
  LeasesInfos:        $root.n2n.LeasesInfos,
};

/**
 * 获取指定名称的 protobuf 消息类型
 * @param {string} name - 消息名称（如 "SnPublicSecret" })
 * @returns {Object} protobufjs Type 对象
 */
function getType(name) {
  const t = types[name];
  if (!t) throw new Error(`Unknown protobuf type: ${name}`);
  return t;
}

/**
 * 编码消息为 protobuf 字节数组
 * @param {string} typeName - 消息类型名称
 * @param {Object} obj - 消息字段值
 * @returns {Uint8Array} 编码后的字节数组
 */
function encode(typeName, obj) {
  return getType(typeName).encode(obj).finish();
}

/**
 * 解码 protobuf 字节数组为消息对象
 * @param {string} typeName - 消息类型名称
 * @param {Uint8Array|ArrayBuffer} buf - 编码后的字节数组
 * @returns {Object} 解码后的消息对象
 */
function decode(typeName, buf) {
  return getType(typeName).decode(buf);
}

export { getType, encode, decode, types };