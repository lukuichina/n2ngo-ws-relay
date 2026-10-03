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
  macBytesToStr,
} from "./packet.js";
import { encode } from "./protos.js";
import { decryptRSA_OAEP, importRSAPrivateKey } from "./crypto.js";
import {
  NatHoleAnalyzer,
  behaviorsForMode,
  pairKeyFor,
  NAT_HOLE_MODE_EASY_PAIR,
  NAT_HOLE_MODE_HARD_PAIR,
  NAT_HOLE_BEHAVIOR_NO_TTL_SENDER_FIRST,
  NAT_HOLE_BEHAVIOR_NO_TTL_RECEIVER_FIRST,
} from "./nathole.js";

// ---------- FRP NAT Hole Coordination ----------
// Ported from frp/pkg/nathole/classify.go + analysis.go.
// The behaviour ladder and the per-pair strategy memory live in nathole.js.

const EasyNAT = "EasyNAT";
const HardNAT = "HardNAT";

const DetectRoleSender = 0;
const DetectRoleReceiver = 1;

// P2PCapacity.Unavailable — mirrored from the Go enum in pkg/p2p/p2p.go.
// Hardcoded because the relay runs as a worker with no access to that package.
const P2P_UNAVAILABLE = 4;

// P2PCapacity.FullDuplex — same mirrored enum. The success report is only
// meaningful while the tunnel it described is still up on *both* sides, and
// a keepalive demotion lands on P2PAvailable(2), not on Unavailable(4), so the
// retirement test below needs this value to tell "still up" from "fell back".
const P2P_FULLDUPLEX = 3;

// How long a freshly recorded success is immune to retirement. A punch takes
// a moment to reach full duplex on both sides, and demotion reports can
// arrive out of order; without this the relay can retire a success it
// recorded moments earlier.
const SUCCESS_GRACE_MS = 30000;

// How long an InProgress report stays authoritative before the relay stops
// waiting on the round it describes.
//
// The edge refreshes the report's `at` once per attempt (p2p.go, detail
// "retrying"), so a round that is genuinely progressing never reaches this
// deadline no matter how long it runs. Only a round that stopped reporting
// without ever producing a terminal state gets here -- a wedged edge, or one
// that vanished mid-round. 60s is far beyond the 5 attempts at ~3s that the
// edge's own punch loop needs for its slowest round.
const PUNCH_INPROGRESS_TIMEOUT_MS = 60000;

// Ceiling on the escalating retry backoff for a pair that has not punched yet.
//
// Was 300000 (5 minutes). The escalation is 15s, 30s, 60s, 120s, 240s, then
// the cap -- so a pair whose first rounds fail waits the full ~12.75 minutes
// before the relay tries again.
//
// That ceiling buys nothing. Each round re-punches the same NAT mapping with
// the same addresses, so round N and round N+6 do not differ in any way that
// raises the odds: an exhausted ladder rung has not become less likely to work
// just because more minutes have passed. Doubling only adds delay before the
// one round that would have succeeded anyway. Measured 2026-09-30: E1/E2 over
// EasyNAT with correct addresses throughout, FRP punched through on its first
// round (3s) while n2n-go burned 5 attempts across 6 backoff rounds for 11m42s
// and then succeeded on the round that was identical to the ones that failed.
//
// 60s keeps the escalation meaningful -- still enough for a NAT mapping to be
// re-established or a peer's assisted address to come up -- while bounding the
// wait after a transient failure to about a minute instead of twelve.
const NAT_HOLE_BACKOFF_CAP_MS = 60000;

/**
 * Decide whether a recorded punch success no longer describes a live tunnel.
 *
 * The bar is Unavailable and nothing looser. A fresh punch reports
 * Pending(1), then Available(2), then FullDuplex(3), and the relay observes
 * every one of those steps on the way up — so retiring on any non-3 value
 * re-punches a healthy pair once per status transition. That is not
 * hypothetical: the 2026-09-29 run retired on (1,0), (2,0) and (0,2), none of
 * which mean the tunnel is down, and each retirement triggered another round
 * of punching on a pair that was already carrying traffic.
 *
 * Unavailable(4) is the one status that does mean it; it is where a
 * keepalive timeout and a failed re-punch both land. The grace period covers
 * the other race — a demotion already in flight when a success arrived
 * reports Unavailable a moment *after* that success, which is when retiring
 * is right, but also when a lagging report could retire a tunnel that is
 * healthy again.
 *
 * @param {number|undefined} senderStatus status the sender reports for the receiver
 * @param {number|undefined} receiverStatus status the receiver reports for the sender
 * @param {{state:number, at:number}|undefined} priorReport recorded outcome, if any
 * @param {number} now epoch ms
 * @returns {boolean} true when the success is stale and should be forgotten
 */
export function shouldRetireSuccess(senderStatus, receiverStatus, priorReport, now) {
  if (!priorReport || priorReport.state !== 3) return false;
  // A recorded success is only worth keeping while the tunnel it described is
  // still up on BOTH sides. The demotion path is SetFullDuplex(false), which
  // writes P2PAvailable(2) -- it never produces P2PUnavailable(4). Gating on 4
  // alone therefore treats "demoted to relay" as "still alive": the success is
  // never retired, the `reported.state === 3` gate in coordinateNatHole keeps
  // `continue`-ing the pair, and no punch instruction is ever emitted again.
  //
  // Symmetric on purpose: a one-sided demotion already means one edge is no
  // longer confirming the tunnel, and it demotes too once its own keepalive
  // expires. Waiting for the second demotion would only delay the re-punch by
  // one keepalive timeout, and keeping the success while either side is still
  // up would leave this bug alive for any pair where only one edge notices the
  // drop first.
  if (senderStatus === P2P_FULLDUPLEX && receiverStatus === P2P_FULLDUPLEX) {
    return false;
  }
  return now - (priorReport.at || 0) > SUCCESS_GRACE_MS;
}

/**
 * Decide whether the relay must hold off re-dispatching because a punch round
 * is already in flight on one of the two edges.
 *
 * InProgress(1) means "a round started, no verdict yet" — not "this pair is
 * failing". The relay used to ignore that distinction and emit a fresh
 * instruction on every inbound P2PStateInfo (edges send one every 2s), which
 * on 2026-10-03 produced 45 byte-identical instructions at a flat 2s cadence
 * for 90 seconds on a pair that was already FullDuplex on both sides. The
 * relay trace shows the self-sustaining loop:
 *
 *   succeeded on ladder index 1 -> score 10
 *   in-progress ... punch dispatched to 172.22.1.17:64165
 *   scheduled (...@1), backoff=15000ms
 *
 * Each round's InProgress overwrote state 3 in this map, so the success gate
 * in coordinateNatHole() missed on the next pass and re-dispatched; the edge
 * receiving that instruction opened another round and reported InProgress
 * again. p2p.go spells out the intended contract — "On the relay side state 1
 * is deliberately inert: recordPunchResult skips the failCount increment and
 * the backoff re-arm (both are state 2 only)" — but only those two arms were
 * made inert; the state write itself was not.
 *
 * So InProgress has to mean what it says. Hold, and let the terminal report
 * (2 = Failed, 3 = Succeeded) drive the next decision — both paths already
 * exist below.
 *
 * The one escape is a stalled round: an edge that stops reporting entirely,
 * never producing 2 or 3. Waiting forever on that would strand the pair, so a
 * report that has not been refreshed within timeoutMs is treated as dead and
 * the caller re-coordinates.
 *
 * @param {{state:number, at:number}|undefined} reported recorded outcome, if any
 * @param {number} now epoch ms
 * @param {number} [timeoutMs]
 * @returns {{hold:boolean, reason:string, wakeAt?:number}}
 */
export function shouldHoldForInProgress(reported, now, timeoutMs = PUNCH_INPROGRESS_TIMEOUT_MS) {
  if (!reported || reported.state !== 1) return { hold: false, reason: "not-in-progress" };
  const wakeAt = (reported.at || 0) + timeoutMs;
  if (now >= wakeAt) {
    // Stalled: the edge stopped refreshing, so no terminal report is coming.
    return { hold: false, reason: "stalled" };
  }
  return { hold: true, reason: "round-in-flight", wakeAt };
}

// ClassifyFeatureCount equivalent of FRP's ClassifyFeatureCount.
// Counts EasyNAT vs HardNAT features and how many HardNAT features
// have regular port changes.
function classifyFeatureCount(features) {
  let easyCount = 0;
  let hardCount = 0;
  let portsChangedRegularCount = 0;
  for (const f of features) {
    if (!f) continue;
    if (f.natType === EasyNAT) { easyCount++; continue; }
    hardCount++;
    if (f.regularPortsChange) portsChangedRegularCount++;
  }
  console.log(`[classifyFeatureCount] features=${features.map(f => f ? f.natType : 'null').join(',')} easyCount=${easyCount} hardCount=${hardCount} portsChangedRegularCount=${portsChangedRegularCount}`);
  return { easyCount, hardCount, portsChangedRegularCount };
}

// Mode 3 (HardNAT & HardNAT, both changes in ports are regular) and Mode 0
// (EasyNAT & EasyNAT) ladders are in nathole.js. Which rung a given pair
// starts on, and where it goes after each outcome, is decided by the
// per-pair NatHoleAnalyzer rather than hardcoded here -- that is the whole
// point of porting it.

const PORTS_RANGE_NUMBER = 10;
const DEFAULT_TTL = 7;

// Decide sender/receiver for a pair of NAT peers.
//
// behaviorIndex selects the rung of the FRP behaviour ladder (see nathole.js);
// it is supplied by the caller's per-pair analyzer. The index travels to the
// edge in NatHoleInstruction.behavior_index, because protobuf3 cannot
// distinguish an unset ttl from "no ttl at all" and "no ttl at all" is what
// ladder entries 4 and 5 mean.
//
// Returns { senderMAC, receiverMAC, senderInstruction, receiverInstruction, mode, behaviorIndex } or null.
function decideNatHoleRoles(peerA, peerB, behaviorIndex = 0) {
  const features = [peerNatFeature(peerA), peerNatFeature(peerB)];
  const { hardCount, portsChangedRegularCount } = classifyFeatureCount(features);

  // Determine coordination mode:
  // - Mode 3/4: both HardNAT → port scanning with portsRange
  // - Mode 5/6: EasyNAT pair → direct P2P, no port scanning needed
  // - Mixed: EasyNAT + HardNAT → simpler coordination (receiver sends to sender pubSocket)
  if (hardCount === 1) {
    // Mixed HardNAT/EasyNAT — not currently handled, skip.
    return null;
  }

  // Deterministic tie-break: lower pub_socket port is the sender.
  //
  // Both pubSockets must be known before the roles can be decided. parsePort
  // maps a missing address to 0, so pairing an edge whose STUN result has not
  // landed yet (pubSocket === "", which happens right after a reconnect and
  // while P2PStateInfo updates are still arriving) makes that edge the sender
  // by default — it sorts below every real port. The pair is then marked as
  // coordinated and burns a backoff slot on an instruction whose sender half
  // carries no address at all, so both sides punch at nothing. That window is
  // exactly the one a reconnect opens, which is why a reconnected edge could
  // sit through several rounds that could never work.
  if (!peerA.pubSocket || !peerB.pubSocket) {
    console.log(
      `[decideNatHoleRoles] defer: pubSocket not settled yet ` +
      `(A=${peerA.pubSocket || "<empty>"} B=${peerB.pubSocket || "<empty>"})`
    );
    return null;
  }
  const portA = parsePort(peerA.pubSocket);
  const portB = parsePort(peerB.pubSocket);
  const sender = portA <= portB ? peerA : peerB;
  const receiver = portA <= portB ? peerB : peerA;

  const portsDiff = Math.abs(
    (peerNatFeature(sender) ? peerNatFeature(sender).portsDifference : 0) -
    (peerNatFeature(receiver) ? peerNatFeature(receiver).portsDifference : 0)
  );

  // FRP Mode 0: for EasyNAT-EasyNAT, no port scanning is needed — the
  // STUN-discovered pubSocket port is exact. The Go handler now responds
  // with a punch ACK to the sender's source address, enabling
  // bidirectional connectivity through cloud NATs without UDP port forwarding.
  // FRP Mode 3: for HardNAT-HardNAT, scan the port range for symmetric NAT.
  const senderNatType = sender.natType || HardNAT;
  const receiverNatType = receiver.natType || HardNAT;
  const bothEasyNAT = senderNatType === EasyNAT && receiverNatType === EasyNAT;

  // The port range must be centred on the port of the peer we are PUNCHING
  // TO, not on our own port. Each side scans the range of its counterpart:
  //   - the sender punches at the receiver  -> scan the RECEIVER's port
  //   - the receiver punches at the sender  -> scan the SENDER's port
  // Using senderPort for both (the previous behaviour) made the sender scan
  // its own port, and the receiver scan the sender's port while also
  // ignoring its own, so neither side ever probed the port it needed.
  const senderPort = parsePort(sender.pubSocket);
  const receiverPort = parsePort(receiver.pubSocket);

  let senderPortsRangeFrom, senderPortsRangeTo;
  let receiverPortsRangeFrom, receiverPortsRangeTo;

  if (bothEasyNAT) {
    // FRP Mode 0 sends an empty CandidatePorts list: the exact candidate
    // address is authoritative and no port scan is performed at all.
    // A zero range disables the Go-side scan loop (it requires port >= 1);
    // the exact-address send still happens on both sides.
    senderPortsRangeFrom = 0;
    senderPortsRangeTo = 0;
    receiverPortsRangeFrom = 0;
    receiverPortsRangeTo = 0;
  } else {
    // FRP Mode 3: scan around the counterpart's observed port.
    const lo = receiverPort - portsDiff - PORTS_RANGE_NUMBER;
    const hi = receiverPort + portsDiff + PORTS_RANGE_NUMBER;
    senderPortsRangeFrom = Math.max(lo, 1);
    senderPortsRangeTo = Math.min(hi, 65535);

    const lo2 = senderPort - portsDiff - PORTS_RANGE_NUMBER;
    const hi2 = senderPort + portsDiff + PORTS_RANGE_NUMBER;
    receiverPortsRangeFrom = Math.max(lo2, 1);
    receiverPortsRangeTo = Math.min(hi2, 65535);
  }

  const mode = bothEasyNAT ? NAT_HOLE_MODE_EASY_PAIR : NAT_HOLE_MODE_HARD_PAIR;
  const ladder = behaviorsForMode(mode);
  const rung = ladder[behaviorIndex] || ladder[0];
  const senderBeh = rung.sender || {};
  const receiverBeh = rung.receiver || {};
  // FRP sends a role's ttl only when the ladder entry names one; a missing
  // ttl means "do not touch the socket's TTL" (nathole.go:363 guards its
  // SetTTL with `if ttl > 0`). Ladder entries 4 and 5 rely on that, and they
  // are the only rungs that can work when the path is longer than the TTL:
  // a probe that dies before the NAT translation point opens no mapping.
  const senderTTL = senderBeh.ttl || 0;
  const receiverTTL = receiverBeh.ttl || 0;
  const senderDelayMs = senderBeh.sendDelayMs || 0;

  const sharedFields = {
    targetMac: strToMacBytes(receiver.macAddr),
    senderMac: strToMacBytes(sender.macAddr),
    senderP2pEndpoint: sender.p2pEndpoint || "",
    senderPubSocket: sender.pubSocket || "",
    // The sender's LAN addresses, copied straight through.
    //
    // FRP parity: pkg/nathole/controller.go:365, `AssistedAddrs:
    // m.AssistedAddrs` -- the server does not inspect them, and the client
    // is the one that decides the order. Note the receiver receives this
    // field too (both roles are handed the same instruction) but ignores
    // it, which mirrors FRP: only the sender branch of nathole.go:210-215
    // reads AssistedAddrs, while the receiver uses CandidateAddrs alone.
    senderAssistedEndpoints: sender.assistedSockets || [],
    senderNatType: sender.natType || HardNAT,
    senderBehavior: (peerNatFeature(sender) ? peerNatFeature(sender).behavior : "BehaviorPortChanged") || "BehaviorPortChanged",
    portsDifference: portsDiff,
    regularPortsChange: !!(peerNatFeature(sender) && peerNatFeature(sender).regularPortsChange),
    // Where on the ladder this came from, so the edge knows a ttl of 0 is a
    // deliberate "full path" and not a missing field.
    mode,
    behaviorIndex,
  };

  const senderInstr = {
    role: DetectRoleSender,
    portsRangeFrom: senderPortsRangeFrom,
    portsRangeTo: senderPortsRangeTo,
    ttl: senderTTL,
    sendDelayMs: senderDelayMs,
    ...sharedFields,
  };

  const receiverInstr = {
    role: DetectRoleReceiver,
    portsRangeFrom: receiverPortsRangeFrom,
    portsRangeTo: receiverPortsRangeTo,
    // 0 is meaningful here and is passed through as-is: it is what makes the
    // edge send with the socket's normal TTL instead of lowering it.
    ttl: receiverTTL,
    // The receiver always goes out first, so it carries no delay of its own.
    sendDelayMs: 0,
    // The receiver punches at the sender, so its target is the sender -- the
    // pre-shared targetMac above names the receiver and must be overridden.
    ...sharedFields,
    targetMac: strToMacBytes(sender.macAddr),
  };

  return {
    senderMAC: sender.macAddr,
    receiverMAC: receiver.macAddr,
    senderInstruction: senderInstr,
    receiverInstruction: receiverInstr,
    mode,
    behaviorIndex,
    senderDelayMs,
  };
}

function parsePort(pubSocket) {
  if (!pubSocket) return 0;
  const idx = pubSocket.lastIndexOf(":");
  if (idx < 0) return 0;
  return parseInt(pubSocket.substring(idx + 1)) || 0;
}

function strToMacBytes(macStr) {
  const parts = macStr.split(":").map(x => parseInt(x, 16));
  return new Uint8Array(parts);
}

// Build a NatFeature from the P2P state info stored on the relay.
// The relay stores p2pInfos per peer (from P2PStateInfo messages),
// but NAT classification data (natType, behavior, portsDifference,
// regularPortsChange) is carried in the RegisterRequest / PeerInfo nat_type field.
// We reconstruct a minimal NatFeature from the peer's stored natType.
function peerNatFeature(peer) {
  if (!peer) return null;
  // For EasyNAT (port-preserving cone NAT), STUN confirmed the
  // public port equals the local P2P socket port.
  if (peer.natType === EasyNAT) {
    return {
      natType: EasyNAT,
      behavior: "BehaviorNoChange",
      portsDifference: 0,
      regularPortsChange: false,
      publicNetwork: false,
    };
  }
  // For HardNAT or unknown, use conservative defaults.
  return {
    natType: peer.natType || "unknown",
    behavior: "BehaviorPortChanged",
    portsDifference: 0,
    regularPortsChange: false,
    publicNetwork: false,
  };
}

// Check if a peer is eligible for NAT hole coordination:
//   - online
//   - P2P state is Available (learned from P2PStateInfo)
//   - NAT type is HardNAT or EasyNAT
//   Both types require coordination: HardNAT needs port scanning,
//   EasyNAT needs pubSocket discovery for direct P2P.
function isCoordEligible(peer, p2pInfos) {
  if (!peer || !peer.online) return false;
  if (peer.natType !== HardNAT && peer.natType !== EasyNAT) return false;
  // P2P reachability is tracked in p2pInfos map (set by handleP2PStateInfo).
  // A peer is "Available" if it has sent P2PStateInfo and has P2P endpoint.
  const info = p2pInfos ? p2pInfos.get(peer.macAddr) : null;
  if (!info) return false;
  if (!peer.p2pEndpoint) return false;
  return true;
}

// Coordinate NAT hole punching for all eligible pairs in the community.
// Returns a Map<macAddr, NatHoleInstruction> of instructions to embed
// in the next PeerInfoList broadcast.
// Moved coordinateNatHole to PacketHandler class as a method.

// How long the newer peer of a pair must have been registered before the first
// punch instruction is handed out.
//
// NAT mappings need time to solidify. When both edges register at the same
// moment the relay pushes both instructions simultaneously, each side punches
// before the other's mapping exists, and the packets are dropped -- exactly
// what was observed (6 rounds x 5 attempts, all lost, backoff escalated to its
// cap). Staggering by a few seconds lets the newcomer's mapping form
// first.
//
// Measured: with the edges started 9s apart the punch succeeded on the first
// attempt, FullDuplex 1s after the instruction, zero failures.
//
// Module-level (not per-instance) because it is read by methods; the value is
// overridden from this.env in the constructor.
let NAT_PUNCH_STAGGER_MS = 8000;

// How long the SENDER's instruction is held back after the RECEIVER's.
//
// FRP parity: pkg/nathole/controller.go:229-240 — frps sends the visitor's
// and the client's NatHoleResp concurrently, but when the recipient's role is
// "sender" it sleeps 1s first:
//
//   g.Go(func() error {
//     if vResp.DetectBehavior.Role == "sender" { time.Sleep(1 * time.Second) }
//     _ = session.visitorTransporter.Send(vResp)
//   })
//
// The rationale in FRP's own comment is "make sure the client has send the
// detect messages". The receiver's low-TTL probe opens its NAT mapping as
// soon as it acts; giving the sender a one-second head start guarantees that
// mapping exists before the sender's first packet leaves, so the receiver's
// NAT does not drop it.
//
// This is NOT the same mechanism as NAT_PUNCH_STAGGER_MS (see
// _staggerGateFor): the stagger delays a pair's FIRST round, keyed on the
// newer peer's registration time, and is a no-op for two long-lived edges
// (registeredAt is in the past → readyAt <= now). This delay is per-role and
// applies to every round, which is the case that was actually failing: both
// edges online for hours, stagger gate inert, both punch simultaneously into
// mappings that may not exist for the destination address yet.
//
// 0 disables the delay (both instructions go out together).
let NAT_SENDER_DISPATCH_DELAY_MS = 1000;

// Delay before re-broadcasting a registration to the peers that are online by
// then. broadcastPeerInfo only reaches whoever is online at the instant it
// runs, so a peer that finished connecting a moment too late never hears
// about the newcomer. Set to "0" to disable the second pass.
let NAT_PEER_LIST_REANNOUNCE_MS = 2000;

export class PacketHandler {
  constructor(env, relayRoom) {
    this.env = env;
    this.relayRoom = relayRoom;
    this.communityManager = relayRoom.communityManager;
    this.snPrivateKey = null; // Supernode RSA 私钥
    this.snPublicKeyDER = null; // Supernode 公钥 DER
    this.snPublicKeyCryptoKey = null; // Supernode 公钥 CryptoKey（用于导出 PEM）



// NAT hole punch broadcast backoff.
    //
    // coordinateNatHole() runs on every inbound P2PStateInfo, and each edge
    // emits those every few seconds. It used to re-derive and re-broadcast
    // instructions for every eligible pair unconditionally, so a pair whose
    // punch could never succeed produced an endless broadcast/punch/retry
    // loop (observed: >15k NatHoleInstruction broadcasts with no progress).
    //
    // Key: "<macA>|<macB>" (sorted, so the pair is order-independent).
    // Value: { nextAllowedAt, backoffMs, signature }
    //
    // The signature folds in both pubSockets and the decided roles: when an
    // edge's STUN-discovered port changes, or the roles flip, the situation
    // is genuinely new and we retry immediately instead of waiting out a
    // stale backoff.
    this.natHoleBackoff = new Map();

    // Latest hole-punch outcome per pair, keyed by "<macA>|<macB>" (sorted).
    // Written by recordPunchResult() from the punchResult field of
    // P2PStateInfo, read by coordinateNatHole().
    //
    // This is the feedback loop that was missing: the relay previously had no
    // way to learn a punch had succeeded, so it kept re-broadcasting for pairs
    // that were already up, and had no signal to prioritise a retry after a
    // failure.
    this.natHolePunchState = new Map();

    // Per-pair strategy memory: which rung of the FRP behaviour ladder to
    // start from for a given pair, and which rung moved last time an edge
    // reported an outcome. See nathole.js.
    //
    // Without it the relay re-derived one hardcoded instruction forever: on
    // 2026-09-27 the E1/E2 pair received 135 NatHoleInstructions, every one
    // identical (role=receiver, ttl=7), and every one of them unable to work
    // on a 12-hop path.
    this.natHoleAnalyzer = new NatHoleAnalyzer();

    // Consecutive failed rounds per pair, so the re-arm backoff escalates
    // instead of hammering at a fixed interval.
    this._failCounts = new Map();

    // Stagger window, configurable per environment (wrangler dev vars / vars
    // in wrangler.toml). Falls back to the module default when unset.
    const configured = this.env && this.env.NAT_PUNCH_STAGGER_MS;
    if (configured != null && configured !== "") {
      const parsed = parseInt(configured, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        NAT_PUNCH_STAGGER_MS = parsed;
      }
    }

    // Per-role dispatch delay for the sender's instruction (FRP frps parity).
    const senderDelay = this.env && this.env.NAT_SENDER_DISPATCH_DELAY_MS;
    if (senderDelay != null && senderDelay !== "") {
      const parsed = parseInt(senderDelay, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        NAT_SENDER_DISPATCH_DELAY_MS = parsed;
      }
    }

    // Second registration broadcast pass (see NAT_PEER_LIST_REANNOUNCE_MS).
    const reanounce = this.env && this.env.NAT_PEER_LIST_REANNOUNCE_MS;
    if (reanounce != null && reanounce !== "") {
      const parsed = parseInt(reanounce, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        NAT_PEER_LIST_REANNOUNCE_MS = parsed;
      }
    }
  }

  /**
   * Record a punch outcome reported by reporterMAC about peerMAC.
   *
   * Both ends of a pair punch, so either may report; the newest report wins.
   * A success also clears the backoff, otherwise the pair would stay
   * suppressed even after it came up.
   */
  /**
   * Consecutive failed rounds for a pair, used to escalate the re-arm backoff.
   * A success resets it to 0.
   */
  _failStreak(pairKey) {
    const reported = this.natHolePunchState.get(pairKey);
    if (!reported) return 0;
    if (reported.state !== 2) return 0;
    // Derive the streak from how long the pair has been reporting failure
    // rather than keeping a separate counter that can drift out of sync.
    const prior = this._failCounts.get(pairKey) || 0;
    return prior;
  }

  /**
   * Drop all per-pair NAT-hole state involving `macAddr`.
   *
   * Called when a peer disconnects or reconnects. Without this, a pair that
   * had already punched successfully keeps a "PunchStateSucceeded" report and
   * a multi-minute backoff entry, so coordinateNatHole() skips it and the
   * reconnected edge waits out the remaining backoff (observed: minutes of
   * silence after a restart, which looks exactly like a broken punch).
   *
   * A reconnect changes the NAT mapping and the STUN-derived addresses, so
   * every cached decision about the pair is stale by definition.
   */
  clearPairStateFor(macAddr) {
    if (!macAddr) return;
    const needle = String(macAddr).toLowerCase();
    const isInKey = (key) =>
      String(key).split("|").some((m) => String(m).toLowerCase() === needle);
    for (const key of this.natHoleBackoff.keys()) {
      if (isInKey(key)) this.natHoleBackoff.delete(key);
    }
    for (const key of this.natHolePunchState.keys()) {
      if (isInKey(key)) this.natHolePunchState.delete(key);
    }
    for (const key of this._failCounts.keys()) {
      if (isInKey(key)) this._failCounts.delete(key);
    }
    // A reconnect changes the NAT mapping, so every "this rung worked for
    // them" credit is stale. FRP parity: frps drops the whole per-client
    // analyzer entry when a client disconnects (controller.go:68,643).
    if (this.natHoleAnalyzer) this.natHoleAnalyzer.forgetMAC(macAddr);
    if (this._lastDispatchedRung) {
      const isInKey2 = (k) =>
        String(k).split("|").some((m) => String(m).toLowerCase() === needle);
      for (const k of this._lastDispatchedRung.keys()) {
        if (isInKey2(k)) this._lastDispatchedRung.delete(k);
      }
    }
  }

  /**
   * Run a NAT-hole decision pass right after `macAddr` registers.
   *
   * Unconditional with respect to the pair's history: by the time this runs,
   * clearPairStateFor() has removed the backoff entry, the recorded punch
   * state and the failure streak, so a pair whose previous session ended in
   * failure starts from the first rung again instead of waiting out a
   * cooldown. A fresh process has a fresh NAT mapping, so the old outcome
   * genuinely does not describe it.
   *
   * Failures are logged and swallowed: a registration must succeed even if
   * hole-punch coordination is broken, and the next P2PStateInfo from either
   * side will drive the same pass anyway.
   */
  coordinateNatHoleOnRegister(commState, macAddr) {
    try {
      const instructions = this.coordinateNatHole(commState);
      if (instructions.size === 0) {
        console.log(
          `[coordinateNatHole] post-register pass for ${macAddr} produced no instruction ` +
          `(no eligible peers, or the stagger gate is still holding the pair)`
        );
        return;
      }
      this.broadcastNatHoleInstructions(commState, instructions)
        .then(() => {
          console.log(
            `[coordinateNatHole] post-register pass for ${macAddr} dispatched ` +
            `${instructions.size} instruction(s)`
          );
        })
        .catch((e) => {
          console.error(
            `[coordinateNatHole] post-register dispatch for ${macAddr} failed:`,
            e
          );
        });
    } catch (e) {
      console.error(
        `[coordinateNatHole] post-register pass for ${macAddr} failed:`,
        e
      );
    }
  }

  recordPunchResult(reporterMAC, peerMAC, result) {
    if (!reporterMAC || !peerMAC || !result) return;
    const key = [reporterMAC, peerMAC].sort().join("|");
    const state = typeof result.state === "number" ? result.state : 0;
    if (state === 0) return; // PunchStateNone carries no information

    // Which rung this outcome belongs to.
    //
    // Taken from the rung WE dispatched, not from the edge's report. The edge
    // fills in its own view of the current rung at the moment it reports, and
    // that view is not the rung it was told to run: the report is asynchronous,
    // it can be delayed behind a reconnect, and the edge restarts and loses it
    // entirely. Crediting the analyzer with that number puts the credit on a
    // strategy that may never have run, and since recommandation is read off
    // these scores the pair then walks a ladder that has nothing to do with
    // what was actually attempted.
    //
    // Observed 2026-09-30 with E1/E2: coordinateNatHole logged a
    // "rung 0->4" re-arm and then recordPunchResult reported "failed on
    // ladder index 0" four times in a row, which cannot happen if the report
    // described the dispatched rung. The scores walked down to -8 and
    // recommandation started emitting rungs at random (0,1,2,3,6,7,8,9,7,8,
    // 0,4,5) instead of escalating, so the pair never held a rung long
    // enough to punch and both ends stayed at P2PStatus=Unavailable.
    //
    // Falls back to the reported value only when we have no dispatch record
    // for this pair at all, which is the pre-existing-strategy-memory case.
    // The dispatch side keys on pairKeyFor(), which lower-cases; the state
    // slot above does not. Try the exact key first, then the normalised one,
    // so a MAC that arrives upper-cased still finds its dispatch record.
    const dispatchedRung = this._lastDispatchedRung
      ? (this._lastDispatchedRung.get(key) ??
        this._lastDispatchedRung.get(pairKeyFor(reporterMAC, peerMAC)))
      : undefined;
    const rung =
      typeof dispatchedRung === "number"
        ? dispatchedRung
        : typeof result.behaviorIndex === "number"
          ? result.behaviorIndex
          : null;

    // Do not clobber a good rung with a report that carries none. The slot is
    // per-pair, not per-(pair,rung), so overwriting it with null would erase
    // the record of the strategy that actually ran.
    const prev = this.natHolePunchState.get(key);
    this.natHolePunchState.set(key, {
      state,
      attempts: result.attempts || 0,
      detail: result.detail || "",
      at: Date.now(),
      // The rung this outcome belongs to, so the analyzer's credit lands on
      // the strategy that actually ran. Null when neither side knew.
      behaviorIndex: rung != null ? rung : prev ? prev.behaviorIndex : null,
    });
    if (state === 3) {
      // Tunnel is up: drop every piece of per-pair retry state so a later
      // drop starts from a clean slate rather than the escalated backoff.
      this.natHoleBackoff.delete(key);
      this._failCounts.delete(key);
    } else if (state === 2) {
      this._failCounts.set(key, (this._failCounts.get(key) || 0) + 1);
    }

    // Feed the strategy memory. FRP parity: HandleReport (controller.go:265)
    // calls analyzer.ReportSuccess(m.Mode, m.Behavior) when the client reports
    // success; we additionally penalise a reported failure, see the comment on
    // NatHoleAnalyzer.report().
    const reported = this.natHolePunchState.get(key);
    if (reported.behaviorIndex != null && (state === 2 || state === 3)) {
      const score = this.natHoleAnalyzer.report(key, reported.behaviorIndex, state === 3);
      console.log(
        `[recordPunchResult] pair ${key} ${state === 3 ? "succeeded" : "failed"} on ` +
        `ladder index ${reported.behaviorIndex} → score ${score}; next rung for this pair: ` +
        `${this.natHoleAnalyzer.recommand(key)}`
      );
    } else if (state === 1) {
      // InProgress is inert -- no failCount, no backoff re-arm, no analyzer
      // credit -- so it never reached the branch above and was invisible in
      // the relay log.
      //
      // That mattered. An edge now reports InProgress the moment it dispatches
      // its first punch, not only once the round ends, so this is the record
      // that says "a round is running right now" -- the distinction between a
      // pair that is slow and a pair that is dead. Without it the dispatch
      // report could not be confirmed to have arrived at all: grepping the log
      // for it returned nothing even with the code deployed, because the log
      // line simply did not exist for this state.
      console.log(
        `[recordPunchResult] pair ${key} in-progress on ladder index ` +
        `${reported.behaviorIndex} (attempts ${reported.attempts}): ${reported.detail}`
      );
    }
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
   * Coordinate NAT hole punching for all eligible pairs in the community.
   * Returns a Map<macAddr, NatHoleInstruction> of instructions to embed
   * in the next PeerInfoList broadcast.
   */
  /**
   * Earliest pending stagger deadline across all pairs, or null if none.
   *
   * coordinateNatHole() only runs when a P2PStateInfo arrives. A staggered
   * pair therefore has no way to become eligible again on its own: once the
   * window is reached nothing re-invokes the decision, and the instruction is
   * never sent. The alarm uses this to schedule the follow-up call.
   */
  _nextStaggerDeadline() {
    let earliest = null;
    const now = Date.now();
    for (const [pairKey, entry] of this.natHoleBackoff) {
      if (!entry || !entry.staggered) continue;
      if (entry.nextAllowedAt <= now) return now; // already due, re-drive now
      if (earliest === null || entry.nextAllowedAt < earliest) {
        earliest = entry.nextAllowedAt;
      }
    }
    return earliest;
  }

  /**
   * Earliest time a pair may be given its first punch instruction.
   *
   * Returns `now` when no staggering is needed. The gate is the newer peer's
   * `registeredAt`: the pair waits until that peer has been online for
   * NAT_PUNCH_STAGGER_MS, so its STUN binding and NAT mapping exist before
   * anyone punches.
   *
   * Returns null when the pair has already attempted once, in which case the
   * caller falls back to the normal backoff path -- staggering must not
   * penalise retries after a real failure.
   */
  _staggerGateFor(pairKey, peerA, peerB, now) {
    // Only stagger a pair's first round.
    if (this.natHoleBackoff.has(pairKey) || this.natHolePunchState.has(pairKey)) {
      return now;
    }

    const registeredAtOf = (peer) => {
      if (!peer) return null;
      // registeredAt is milliseconds since epoch (set in addPeer). Older
      // snapshots may hold seconds; normalise defensively.
      const v = peer.registeredAt;
      if (!v || typeof v !== "number") return null;
      return v < 1e12 ? v * 1000 : v;
    };

    const a = registeredAtOf(peerA);
    const b = registeredAtOf(peerB);
    if (a == null || b == null) return now; // cannot tell, do not delay

    // The newer of the two is the one that needs settling time.
    const newestRegistered = Math.max(a, b);
    const readyAt = newestRegistered + NAT_PUNCH_STAGGER_MS;
    return now < readyAt ? readyAt : now;
  }

  coordinateNatHole(commState) {
    // Defensive: Durable Object instances can be re-created (eviction /
    // hibernate-thaw), which would drop the backoff map and re-open the loop.
    if (!this.natHoleBackoff) this.natHoleBackoff = new Map();
    const instructions = new Map();
    const onlinePeers = commState.getOnlinePeers();
    const eligible = [];

    for (const p of onlinePeers) {
      if (isCoordEligible(p, commState.p2pInfos)) {
        eligible.push(p);
      }
    }

    console.log(`[coordinateNatHole] onlinePeers=${onlinePeers.length} eligible=${eligible.length}`);
    for (const p of eligible) {
      // observedRaddr is logged alongside pubSocket because the two diverge
      // exactly when a NAT binds a per-destination port, which is the case
      // where punching at pub_socket silently fails.
      console.log(`[coordinateNatHole] eligible mac=${p.macAddr} natType=${p.natType} p2pEndpoint=${p.p2pEndpoint} pubSocket=${p.pubSocket} observedRaddr=${p.observedRaddr || "<none>"}`);
    }

    // Pair up eligible peers and decide roles.
    const paired = new Set();
    for (let i = 0; i < eligible.length; i++) {
      if (paired.has(eligible[i].macAddr)) continue;
      for (let j = i + 1; j < eligible.length; j++) {
        if (paired.has(eligible[j].macAddr)) continue;

        // Which rung of the behaviour ladder this pair starts from.
        //
        // FRP parity: pkg/nathole/analysis.go:210-260 -- a per-pair score
        // vector, recommended before the instruction is built, credited when
        // an edge reports the outcome. Previously the relay emitted one
        // hardcoded instruction forever: 135 identical NatHoleInstructions
        // for the E1/E2 pair on 2026-09-27, all role=receiver/ttl=7, none of
        // which could work on a 12-hop path.
        const ladderKey = pairKeyFor(eligible[i].macAddr, eligible[j].macAddr);
        const behaviorIndex = this.natHoleAnalyzer.recommand(ladderKey);
        const result = decideNatHoleRoles(eligible[i], eligible[j], behaviorIndex);
        if (!result) continue;

        // Which rung was ACTUALLY dispatched for this pair, read before the
        // bookkeeping below overwrites it. Getting this wrong makes the
        // strategy-change detection in the backoff gate below compare the
        // current rung against itself, which is always equal -- so the backoff
        // would never reset and the ladder would stay stuck on the rung that
        // just failed.
        const lastRung = this._lastDispatchedRung
          ? this._lastDispatchedRung.get(ladderKey)
          : undefined;
        const strategyChanged = lastRung !== undefined && lastRung !== behaviorIndex;
        this._lastDispatchedRung = this._lastDispatchedRung || new Map();
        this._lastDispatchedRung.set(ladderKey, behaviorIndex);

        // Backoff gate.
        //
        // coordinateNatHole() is invoked on every inbound P2PStateInfo (each
        // edge emits one every few seconds) and used to re-broadcast the same
        // pair unconditionally, so a pair that cannot punch loops forever
        // (observed: >15k broadcasts, and 152/60s even after a first attempt).
        //
        // The gate keys on the pair's identity and a STABLE signature. An
        // earlier version folded pubSocket into the signature to retry
        // immediately on a NAT port change, but pubSocket flaps between empty
        // and set as P2PStateInfo updates land, so the signature changed on
        // nearly every call and the backoff was bypassed entirely.
        //
        // Instead: pubSocket is deliberately excluded, and a pair is retried
        // early only when it previously SUCCEEDED (P2PStatus shows the tunnel
        // is up). Genuine NAT port changes are picked up by the backoff cap.
        const pairKey = [result.senderMAC, result.receiverMAC].sort().join("|");
        // The rung is part of the signature on purpose. A pair that has just
        // been told to try a different ladder entry must not be suppressed by
        // the backoff that was armed for the previous one -- otherwise the
        // strategy memory decides the next rung and then the backoff throws
        // the decision away, and the pair is back to retrying rung 0 forever.
        const signature =
          result.senderMAC + "->" + result.receiverMAC + "@" + result.behaviorIndex;
        const now = Date.now();

        // A pair that already has a live tunnel must be re-coordinated
        // promptly (e.g. after the other side's NAT port changes), so clear
        // its backoff.
        //
        // p2pInfos is keyed by the *reporting* edge and holds a {from, to}
        // pair: `to` is what that edge says about each of its peers. So a
        // side's status toward its partner is not the partner's own entry --
        // it is the partner's row inside the reporter's `to` list. Reading
        // info.p2pStatus straight off the map value returned undefined
        // forever, because the normalised object has no top-level status at
        // all; that made every comparison below vacuously "not full duplex".
        const statusOf = (reporterMac, peerMac) => {
          const info = commState.p2pInfos && commState.p2pInfos.get(reporterMac);
          if (!info || !Array.isArray(info.to)) return undefined;
          const row = info.to.find((x) => x && x.macAddr === peerMac);
          return row ? row.p2pStatus : undefined;
        };
        // See shouldRetireSuccess() above for why the bar is Unavailable only.
        //

        // === A "succeeded" report only describes the tunnel it was made for ===
        //
        // The success gate below suppresses a pair indefinitely, which is
        // correct while the tunnel it refers to is actually up. But the
        // report is never retired: natHolePunchState survives until a peer
        // disconnects, and neither a keepalive demotion nor a NAT mapping
        // expiring clears it. Both sides demote to the relay, the relay still
        // believes the pair punched successfully, and no instruction is ever
        // emitted again — the pair is stuck on the relay with no path back,
        // which is what a failed punch after a restart looks like from the
        // outside.
        //
        // So the success report is retired as soon as the tunnel it described
        // is gone. A demotion is reported through P2PStateInfo, so this
        // converges on the same signal the success was derived from. The rule
        // itself lives in shouldRetireSuccess() so it can be tested directly.
        const senderStatus = statusOf(result.senderMAC, result.receiverMAC);
        const receiverStatus = statusOf(result.receiverMAC, result.senderMAC);
        const priorReport = this.natHolePunchState.get(pairKey);
        if (shouldRetireSuccess(senderStatus, receiverStatus, priorReport, now)) {
          this.natHolePunchState.delete(pairKey);
          this._failCounts.delete(pairKey);
          this.natHoleBackoff.delete(pairKey);
          console.log(
            `[coordinateNatHole] pair ${pairKey} retired a stale success ` +
            `(senderStatus=${senderStatus} receiverStatus=${receiverStatus}) — re-coordinating`
          );
        }

        if (senderStatus === 3 || receiverStatus === 3) {
          // 3 == full duplex: tunnel is up, no need to hold it back.
          this.natHoleBackoff.delete(pairKey);
        }

        // === Stagger gate (first round only) ===
        //
        // Hold the pair until the newer peer has been registered long enough
        // for its NAT mapping to exist. Without this, edges that register at
        // the same instant punch each other before either mapping is up and
        // the whole round is lost.
        // An expired stagger marker must be cleared before the decision
        // below, otherwise the pair keeps re-arming itself forever and the
        // instruction is never actually emitted.
        const priorEntry = this.natHoleBackoff.get(pairKey);
        if (priorEntry && priorEntry.staggered && priorEntry.nextAllowedAt <= now) {
          this.natHoleBackoff.delete(pairKey);
        }

        const readyAt = this._staggerGateFor(
          pairKey,
          eligible[i],
          eligible[j],
          now
        );
        if (readyAt > now) {
          this.natHoleBackoff.set(pairKey, {
            nextAllowedAt: readyAt,
            backoffMs: readyAt - now,
            signature,
            staggered: true,
          });
          console.log(
            `[coordinateNatHole] pair ${pairKey} staggered ` +
            `${Math.ceil((readyAt - now) / 1000)}s (newest peer needs its NAT mapping)`
          );
          // Arm a wake for when the window expires. coordinateNatHole() is
          // only invoked on inbound P2PStateInfo, so without this the pair
          // would never be re-decided and the instruction never sent.
          if (this.relayRoom && typeof this.relayRoom.armStaggerWake === "function") {
            this.relayRoom.armStaggerWake(readyAt).catch((e) =>
              console.error("[coordinateNatHole] armStaggerWake failed:", e)
            );
          }
          continue;
        }

        // === Feedback-driven coordination ===
        //
        // The edges now report each punch round's outcome, so the relay no
        // longer has to guess. Previously it broadcast on a fixed timer and
        // only a blunt backoff kept that from becoming a storm.
        const reported = this.natHolePunchState.get(pairKey);

        // 3 == PunchStateSucceeded: the tunnel is up. Stop broadcasting for
        // this pair entirely until an edge reports otherwise.
        if (reported && reported.state === 3) {
          continue;
        }

        // 1 == PunchStateInProgress: a round is already running. Emitting now
        // would stack a second round on the first, and the InProgress each
        // round reports would overwrite whatever the other edge just recorded
        // -- the 2s re-dispatch loop described in shouldHoldForInProgress().
        // Wait for the terminal report and re-decide on it.
        const inProgressHold = shouldHoldForInProgress(reported, now);
        if (inProgressHold.hold) {
          // coordinateNatHole() only runs on an inbound P2PStateInfo, so
          // without a wake a round that ends while the edges go quiet would
          // never be re-decided. Arm the round's own deadline.
          if (this.relayRoom && typeof this.relayRoom.armStaggerWake === "function") {
            this.relayRoom
              .armStaggerWake(inProgressHold.wakeAt)
              .catch((e) =>
                console.error("[coordinateNatHole] in-progress wake arm failed:", e)
              );
          }
          continue; // round in flight, waiting on Failed or Succeeded
        }
        if (inProgressHold.reason === "stalled") {
          console.log(
            `[coordinateNatHole] pair ${pairKey} in-progress stale for ` +
            `${Math.round((now - reported.at) / 1000)}s with no terminal report — re-coordinating`
          );
        }

        // 2 == PunchStateFailed: the round just burned out. Re-arm now rather
        // than waiting out the accumulated backoff, but keep the escalating
        // schedule so a pair that can never punch degrades to the cap
        // instead of spinning.
        let rearmWakeAt = null;
        if (reported && reported.state === 2) {
          const attempts = this.natHolePunchState.get(pairKey).attempts || 0;
          const backoffMs = Math.min(
            Math.max(15000, attempts * 1000) *
              Math.pow(2, this._failStreak(pairKey)),
            NAT_HOLE_BACKOFF_CAP_MS
          );
          // Escalate from the window that is actually in force, not from the
          // value this branch is about to write.
          //
          // This branch runs on every inbound P2PStateInfo (edges send one
          // every 2s), and the backoff gate below reads the SAME key this
          // branch writes. Before the fix, each pass wrote now+backoffMs and
          // then the gate compared `now < now+backoffMs` against that fresh
          // value, so the pair suppressed itself on every single pass and
          // re-armed to 60s forever: a self-perpetuating backoff that could
          // never expire. Observed in the field as three consecutive
          // "re-armed after failure (backoff=60000ms)" lines with no
          // "scheduled" line following any of them.
          //
          // Growing from `previous` keeps the escalation monotonic across
          // passes: each one lengthens the window rather than resetting it to
          // a fresh 60s from "now", so a pair that can never punch still
          // reaches the cap and stops.
          const previous = this.natHoleBackoff.get(pairKey);
          const escalating =
            previous &&
            previous.signature === signature &&
            !strategyChanged &&
            previous.backoffMs > 0;
          const armedMs = escalating
            ? Math.min(Math.max(previous.backoffMs, backoffMs), NAT_HOLE_BACKOFF_CAP_MS)
            : backoffMs;

          rearmWakeAt = now + armedMs;
          this.natHoleBackoff.set(pairKey, {
            nextAllowedAt: rearmWakeAt,
            backoffMs: armedMs,
            signature,
          });
          console.log(
            `[coordinateNatHole] pair ${pairKey} re-armed after failure ` +
            `(attempts=${attempts}, rung ${lastRung}->${behaviorIndex}` +
            `${strategyChanged ? ", strategy changed" : ""}, backoff=${armedMs}ms)`
          );
        }

        const prev = this.natHoleBackoff.get(pairKey);
        if (
          prev &&
          prev.signature === signature &&
          !strategyChanged &&
          now < prev.nextAllowedAt
        ) {
          // SUPPRESSED: within backoff window (this is the path that stops
          // the broadcast storm).
          //
          // But coordinateNatHole() only runs when a P2PStateInfo arrives,
          // and an edge that is waiting for an instruction punches nothing and
          // therefore reports nothing. So this continue used to be terminal:
          // the window would expire with nothing left to notice it, the pair
          // would never be re-decided, and no instruction would ever be sent
          // again. Observed in the field as a pair stuck on relay for 13+
          // minutes with its last punch at 03:53:30 and only
          // "re-armed after failure" in the relay log -- never "scheduled".
          //
          // armStaggerWake is the wake this path was missing. It is not
          // stagger-specific: the alarm handler runs
          // reBroadcastNatHoleInstructions(), which is the full decision pass.
          // Arm it for the window's own deadline, and take the minimum with
          // any deadline the re-arm branch just recorded so the single alarm
          // slot is never won by the later one.
          {
            const wakeAt = prev.nextAllowedAt;
            const due = rearmWakeAt != null ? Math.min(rearmWakeAt, wakeAt) : wakeAt;
            if (this.relayRoom && typeof this.relayRoom.armStaggerWake === "function") {
              this.relayRoom
                .armStaggerWake(due)
                .catch((e) =>
                  console.error("[coordinateNatHole] backoff wake arm failed:", e)
                );
            }
          }
          continue; // still cooling down
        }

        // First attempt after a reset: 15s (matches the edge's own
        // 5-attempt punch window). Each further failure doubles it, capped at
        // NAT_HOLE_BACKOFF_CAP_MS so a pair whose NAT mapping has since
        // changed still gets retried.
        //
        // The signature already carries the rung, so a changed rung always
        // lands here on the 15s path -- including when strategyChanged is
        // false but the pair is resuming after a silence long enough for
        // nextAllowedAt to have passed.
        const backoffMs = prev && prev.signature === signature && !strategyChanged
          ? Math.min(prev.backoffMs * 2, NAT_HOLE_BACKOFF_CAP_MS)
          : 15000;
        this.natHoleBackoff.set(pairKey, {
          nextAllowedAt: now + backoffMs,
          backoffMs,
          signature,
        });

        instructions.set(result.senderMAC, result.senderInstruction);
        instructions.set(result.receiverMAC, result.receiverInstruction);
        paired.add(result.senderMAC);
        paired.add(result.receiverMAC);
        console.log(`[coordinateNatHole] pair ${pairKey} scheduled (roles ${signature}), backoff=${backoffMs}ms`);
        break; // each peer gets at most one instruction
      }
    }

    return instructions;
  }

  /**
   * 处理入站 WebSocket 消息
   * @param {WebSocket} ws
   * @param {ArrayBuffer|Uint8Array} data
   */
  async handleMessage(ws, data) {
    const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
    // Per-message tracing is off by default. It cost 165k lines over 11
    // minutes of a two-node test — 7.5 messages/s, two lines each, plus a
    // 16-byte hex dump — and 68% of the resulting log volume was wrangler's
    // inspector proxying every one of those console calls. Set
    // DEBUG_PACKET_TRACE="1" in wrangler.toml when a packet-level trace is
    // genuinely wanted.
    if (this.env && this.env.DEBUG_PACKET_TRACE === "1") {
      console.debug(`[PacketHandler] handleMessage called, buffer length=${buf.length}, first 16 bytes=${Array.from(buf.slice(0,16)).map(b=>b.toString(16).padStart(2,'0')).join(' ')}`);

    // 检查 WebSocket 关联的社区
    const connInfo = this.relayRoom.connections.get(ws);
      console.debug(`[PacketHandler] WS connection info:`, connInfo ? { community: connInfo.community, macAddr: connInfo.macAddr?.toString() } : 'none');
    }

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
        await this.handlePing(ws, commState, header, payload, rawBuf);
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

    // A (re)connecting edge has a fresh NAT mapping and fresh STUN-derived
    // addresses, so every cached punch decision for its pairs is stale.
    // Clearing here is what makes a reconnect re-coordinate on the very next
    // coordinateNatHole() pass rather than sitting out a backoff window that
    // was computed for a session that no longer exists (observed as ~5
    // minutes of silence after a restart).
    this.clearPairStateFor(req.edgeMACAddr);

    // 注册 Peer
    const { virtualIP, isNew, peerInfo } = await commState.registerPeer({
      macAddr: req.edgeMACAddr,
      ws,
      p2pEndpoint: req.p2pEndpoint,
      p2pCapabilities: req.p2pCapabilities,
      pubSocket: req.pubSocket || "",
      natType: req.natType || "unknown",
      // FRP parity: frpc reports its LAN addresses with the rest of its
      // NAT feature (pkg/nathole/nathole.go:145-149) and frps relays them
      // to the other side untouched.
      assistedSockets: req.assistedSockets || [],
      encryptedMachineID: machineID,
    });

    console.log(
      `[PacketHandler] ${req.edgeMACAddr} NAT feature: natType=${req.natType} ` +
      `pubSocket=${req.pubSocket || "<none>"} ` +
      `assistedSockets=${JSON.stringify(req.assistedSockets || [])}`
    );

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

    // 广播 Peer 加入/回归通知 (TypeRegister)
    //
    // NOT gated on isNew. A reconnecting peer must also be announced, or the
    // peers that are still connected keep whatever (possibly empty, or
    // stale) list they last received. Worse, the Go edge treats a peer list
    // as a full snapshot and removes every peer missing from it
    // (pkg/p2p/p2p.go HandlePeerInfoList), so one truncated list erases a
    // peer permanently from the other side.
    //
    // The peer that just registered is excluded inside broadcastPeerInfo.
    await this.broadcastPeerInfo(commState, peerInfo, PeerInfoEvent.TypeRegister);

    // Re-broadcast shortly after registration.
    //
    // broadcastPeerInfo delivers to getOnlinePeers() *at that moment*. If the
    // other edge's WebSocket dropped (or it had not finished registering yet)
    // it is not in that set and the notification is silently dropped — only
    // a console.log records it. A second pass a moment later catches the peer
    // that has just come up, which is exactly the ordering that produced
    // "peer lookup failed for <mac>" on one side while the other side saw the
    // pair fine.
    if (NAT_PEER_LIST_REANNOUNCE_MS > 0) {
      const delayMs = NAT_PEER_LIST_REANNOUNCE_MS;
      const reannounce = new Promise((resolve) => setTimeout(resolve, delayMs)).then(
        async () => {
          try {
            const online = commState.getOnlinePeers();
            if (online.length > 0) {
              await this.broadcastPeerInfo(commState, peerInfo, PeerInfoEvent.TypeRegister);
              console.log(
                `[PacketHandler] re-announced ${req.edgeMACAddr} after ${delayMs}ms to ${online.length} online peer(s)`
              );
            }
          } catch (e) {
            console.error(`[PacketHandler] re-announce of ${req.edgeMACAddr} failed:`, e);
          }
        }
      );
      // Keep the DO alive for the delay. this.state is the Durable Object
      // state; PacketHandler itself has no ctx, so reach waitUntil via the
      // room. If it is unavailable for any reason, the timer still fires —
      // it just may not keep the isolate alive across the delay.
      const state = this.relayRoom && this.relayRoom.state;
      if (state && typeof state.waitUntil === "function") {
        state.waitUntil(reannounce);
      } else {
        reannounce.catch(() => {});
      }
    }

    // A (re)registration is an unconditional instruction to re-coordinate
    // every pair this edge belongs to.
    //
    // clearPairStateFor() above already dropped the backoff, the punch state,
    // the failure streak and the analyzer credit, so nothing here can be
    // suppressed by a cooldown computed for the previous session. Driving the
    // decision pass explicitly is what makes that reset actually observable:
    // coordinateNatHole() otherwise only runs when some edge happens to send
    // P2PStateInfo, and after a restart both sides go quiet — the newcomer
    // behind its own post-register burst, the incumbent because nothing
    // changed for it. Observed as a restart that waited out a full backoff
    // window before punching.
    //
    // The stagger gate may still hold the pair back for NAT_PUNCH_STAGGER_MS
    // after this registration, which is correct and cheap (1s by default): it
    // arms its own wake through armStaggerWake().
    this.coordinateNatHoleOnRegister(commState, req.edgeMACAddr);

    console.log(`[PacketHandler] ${req.edgeMACAddr} registered (isNew=${isNew}) with virtual IP ${numberToIp(virtualIP)}`);
  }

  /**
   * 处理心跳
   */
  async handlePing(ws, commState, header, payload, rawBuf) {
    // 更新 Peer 最后见到时间
    const connInfo = this.relayRoom.connections.get(ws);
    const srcMAC = formatMAC(header.srcMAC);
    if (connInfo) {
      commState.updatePeer(connInfo.macAddr, { lastSeen: Math.floor(Date.now() / 1000) });
    }

    const dstMAC = formatMAC(header.dstMAC);

    // PING/PONG 目标为具体 Peer（非 supernode 00:00...） → 转发给目标 Peer
    if (dstMAC !== "00:00:00:00:00:00" && dstMAC !== srcMAC) {
      const targetPeer = commState.getPeer(dstMAC);
      if (targetPeer && targetPeer.online && targetPeer.ws) {
        try {
          // 标记 FromSuperNode 标志，透传原始缓冲区
          let snBuf = rawBuf;
          if (rawBuf && rawBuf.length > 0 && rawBuf[0] === VERSION) {
            snBuf = flagPacketFromSupernode(rawBuf);
          }
          await targetPeer.ws.send(snBuf);
          console.log(`[PacketHandler] Forwarded PING/PONG to ${dstMAC} (FlagFromSuperNode set)`);
        } catch (e) {
          console.error(`[PacketHandler] Failed to forward PING/PONG to ${dstMAC}: ${e.message}`);
        }
      } else {
        console.log(`[PacketHandler] PING/PONG target ${dstMAC} not online, dropping`);
      }
    } else if (dstMAC === "00:00:00:00:00:00") {
      // PING 发往 supernode 自身 — 回复 Pong 保持连接活跃
      await this.sendPacket(ws, {
        packetType: PacketType.Pong,
        communityId: header.communityId,
        srcMAC: header.dstMAC,
        dstMAC: header.srcMAC,
        payload: payload || new Uint8Array(0),
      });
    }
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
    // Update the peer's pubSocket from the P2PStateInfo if present.
    // This is necessary because encodeRegisterRequest may not include
    // the pubSocket (it's computed after STUN discovery which happens
    // at runtime, not registration time).
    if (p2pInfos.from && p2pInfos.from.pubSocket) {
      commState.updatePeer(connInfo.macAddr, { pubSocket: p2pInfos.from.pubSocket });
    }
    // Refresh p2pEndpoint alongside pubSocket. It used to be written only at
    // registration time, so an edge that reconnected WITHOUT re-registering
    // kept advertising the endpoint (and therefore the UDP port) it had before
    // the restart. coordinateNatHole then put that dead port into
    // senderP2pEndpoint and the peer punched at it for a full backoff cycle.
    if (p2pInfos.from && p2pInfos.from.p2pEndpoint) {
      commState.updatePeer(connInfo.macAddr, { p2pEndpoint: p2pInfos.from.p2pEndpoint });
    }
    // Record the observed source addresses this peer reports for others.
    // A pubSocket is only a STUN snapshot valid for the STUN server's
    // destination; observedRaddr is where packets actually arrive from,
    // so relaying it lets peers punch to a reachable address.
    if (p2pInfos.from && p2pInfos.from.observedRaddr) {
      commState.updatePeer(connInfo.macAddr, { observedRaddr: p2pInfos.from.observedRaddr });
    }
    if (Array.isArray(p2pInfos.to)) {
      for (const t of p2pInfos.to) {
        // Hole-punch outcome reported by this edge about a peer. Store it so
        // coordinateNatHole can (a) stop broadcasting once a pair is up and
        // (b) re-arm immediately after a failure. Without this feedback the
        // relay is blind: it can neither confirm success nor prioritise a
        // retry, and just keeps pushing instructions forever.
        if (t && t.punchResult && t.punchResultPeerMac) {
          this.recordPunchResult(connInfo.macAddr, t.punchResultPeerMac, t.punchResult);
        }
        if (t && t.observedRaddr && t.macAddr) {
          commState.updatePeer(t.macAddr, { observedRaddr: t.observedRaddr });
        }
      }
    }
    commState.updatePeer(connInfo.macAddr, {
      lastSeen: Math.floor(Date.now() / 1000),
    });

    console.log(`[PacketHandler] P2PStateInfo: from=${connInfo.macAddr} to=${p2pInfos.to ? p2pInfos.to.length : 0} payloadLen=${payload ? payload.length : 0}`);

    // After updating P2P reachability, attempt NAT hole coordination
    // for HardNAT peers that have become Available.
    try {
      const instructions = this.coordinateNatHole(commState);
      if (instructions.size > 0) {
        await this.broadcastNatHoleInstructions(commState, instructions);
      }
    } catch (e) {
      console.error("[PacketHandler] coordinateNatHole error:", e);
    }
  }

  /**
   * Broadcast PeerInfoList with embedded NatHoleInstruction to the community.
   * Each eligible peer receives its own instruction in the peer_infos entry.
   *
   * The two roles are dispatched separately: receivers go out immediately,
   * senders NAT_SENDER_DISPATCH_DELAY_MS later. This mirrors frps, which
   * holds back a sender's NatHoleResp by 1s (pkg/nathole/controller.go:229-240)
   * so the receiver's NAT mapping is already open when the sender's first
   * punch leaves. See NAT_SENDER_DISPATCH_DELAY_MS for the full rationale.
   *
   * Splitting the broadcast is safe: each edge only ever acts on the
   * instruction addressed to its own MAC (handleNatHoleInstruction in
   * pkg/edge/handlers_missing.go keys on ourMAC and ignores everything else),
   * so neither side needs to see the other's copy.
   */
  async broadcastNatHoleInstructions(commState, instructions) {
    const receivers = new Map();
    const senders = new Map();
    for (const [mac, instr] of instructions) {
      (instr.role === DetectRoleSender ? senders : receivers).set(mac, instr);
    }

    let sent = await this.sendNatHoleInstructionBatch(commState, receivers);

    if (senders.size > 0) {
      // The ladder entry can override the delay per round: FRP's mode0
      // entries 6-9 ask the sender to wait 5s or 10s instead of the
      // default 1s, which is what a symmetric NAT needs before the
      // receiver's mapping exists. 0 on the instruction means "use the
      // configured default".
      let delayMs = NAT_SENDER_DISPATCH_DELAY_MS;
      for (const [, instr] of senders) {
        if (instr.sendDelayMs) {
          delayMs = instr.sendDelayMs;
          break;
        }
      }
      if (delayMs <= 0) {
        sent += await this.sendNatHoleInstructionBatch(commState, senders);
      } else {
        // Awaited rather than setTimeout'd: a Durable Object may be evicted
        // between the handler returning and a timer firing, and a dropped
        // sender instruction costs a whole punch round (~15s of backoff).
        await new Promise((r) => setTimeout(r, delayMs));
        sent += await this.sendNatHoleInstructionBatch(commState, senders);
        console.log(
          `[PacketHandler] broadcastNatHoleInstructions: sender instruction held back ${delayMs}ms (FRP frps parity)`
        );
      }
    }

    console.log(`[PacketHandler] broadcastNatHoleInstructions: ${sent} peer(s) notified in community ${commState.community} (${receivers.size} receiver now, ${senders.size} sender delayed)`);
  }

  /**
   * Send one PeerInfoList carrying exactly the given per-peer instructions.
   */
  async sendNatHoleInstructionBatch(commState, instructions) {
    if (instructions.size === 0) return 0;
    const list = commState.buildPeerInfoList("", PeerInfoEvent.TypeList, instructions);
    const payload = encodePeerInfoList(list);

    const onlinePeers = commState.getOnlinePeers();
    let sent = 0;
    for (const p of onlinePeers) {
      if (!p.ws || p.ws.readyState !== WebSocket.OPEN) continue;
      // Only send to peers that have an instruction, plus the sender/receiver
      // so they can discover each other's instruction.
      const instr = instructions.get(p.macAddr);
      if (!instr) continue;
      await this.sendPacket(p.ws, {
        packetType: PacketType.PeerInfo,
        communityId: hashCommunity(commState.community),
        srcMAC: parseMAC("00:00:00:00:00:00"),
        dstMAC: new Uint8Array(6),
        payload,
      });
      sent++;
    }
    return sent;
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

    // Snapshot the departing peer BEFORE unregisterPeer() flips it offline.
    // The notification has to name it explicitly: buildPeerInfoList's default
    // source is getOnlinePeers(), which by definition no longer contains it.
    const departing = commState.peers.get(String(connInfo.macAddr).toLowerCase());

    await commState.unregisterPeer(connInfo.macAddr);
    this.clearPairStateFor(connInfo.macAddr);
    this.relayRoom.connections.delete(ws);

    // 广播 Peer 下线通知
    //
    // The payload names exactly one peer: the one that left. Every remaining
    // edge deletes only that MAC from its registry and leaves its own peers
    // alone, which is the isolation FRP gets for free from never shipping a
    // peer list to clients at all.
    if (departing) {
      await this.broadcastPeerInfo(
        commState,
        { macAddr: connInfo.macAddr },
        PeerInfoEvent.TypeUnregister,
        [departing]
      );
    } else {
      console.warn(
        `[PacketHandler] ${connInfo.macAddr} unregistered but had no registry entry — ` +
        `no unregister notification sent (nothing to name in it)`
      );
    }

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
   *
   * `peerOverride` supplies the payload's peer_infos explicitly instead of
   * getOnlinePeers(). It is required for a TypeUnregister broadcast: the Go
   * edge deletes every MAC listed in that event type (pkg/p2p/p2p.go,
   * HandlePeerInfoList case TypeUnregister), so a payload built from
   * getOnlinePeers() -- i.e. the nodes that are *staying* -- turns one node
   * going offline into a registry wipe of every other pair. See
   * buildPeerInfoList.
   */
  async broadcastPeerInfo(commState, peerInfo, eventType, peerOverride = null) {
    const list = commState.buildPeerInfoList(peerInfo.macAddr, eventType, null, peerOverride);
    const payload = encodePeerInfoList(list);

    const onlinePeers = commState.getOnlinePeers();
    const listed = (list.peer_infos || []).map((i) => macBytesToStr(i.mac_addr));
    console.log(`[broadcastPeerInfo] eventType=${eventType} registeringMac=${peerInfo.macAddr} onlinePeers=${onlinePeers.length} payloadMacs=[${listed.join(",")}]`);
    for (const p of onlinePeers) {
      if (p.macAddr === peerInfo.macAddr) {
        console.log(`[broadcastPeerInfo] skipping self ${p.macAddr}`);
        continue; // 不发给自己
      }
      if (!p.ws || p.ws.readyState !== WebSocket.OPEN) {
        console.log(`[broadcastPeerInfo] skipping ${p.macAddr} - ws not open (readyState=${p.ws ? p.ws.readyState : 'null'})`);
        continue;
      }

      const result = await this.sendPacket(p.ws, {
        packetType: PacketType.PeerInfo,
        communityId: hashCommunity(commState.community),
        srcMAC: parseMAC("00:00:00:00:00:00"),
        dstMAC: new Uint8Array(6),
        payload,
      });
      console.log(`[broadcastPeerInfo] sent PeerInfo to ${p.macAddr}: ${result}`);
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
    const list = commState.buildPeerInfoList(header.srcMAC ? formatMAC(header.srcMAC) : "", PeerInfoEvent.TypeList);
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
      // FIX: Check readyState before sending (sendPacket does this, but ForwardWithFallBack was missing it)
      if (targetPeer.ws.readyState !== WebSocket.OPEN) {
        console.error(`[PacketHandler] ForwardWithFallBack: target ${dstMAC} ws not OPEN (readyState=${targetPeer.ws.readyState}), falling back to broadcast`);
      } else {
        try {
          await targetPeer.ws.send(snBuf);
          console.log(`[PacketHandler] ForwardWithFallBack: unicast forward to ${dstMAC} OK (FlagFromSuperNode set)`);
          return;
        } catch (e) {
          console.error(`[PacketHandler] ForwardWithFallBack: unicast forward ERROR to ${dstMAC}: ${e.message}`);
          // 转发失败，继续回退广播
        }
      }
    }

    // 回退广播：目标不存在、离线，ws 非 OPEN，或单播转发失败
    const onlinePeers = commState.getOnlinePeers();
    console.log(`[PacketHandler] ForwardWithFallBack: falling back to broadcast, ` +
      `target=${dstMAC} not available, broadcasting to ${onlinePeers.length} online peers ` +
      `(sender=${srcMAC})`);

    for (const p of onlinePeers) {
      if (p.ws && p.ws !== ws && p.ws.readyState === WebSocket.OPEN) {
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