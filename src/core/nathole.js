// FRP NAT-hole behaviour ladder and per-pair strategy memory.
//
// Direct port of frp-0.71.0/pkg/nathole/analysis.go. Two things are copied:
//
//   1. The ladder itself (mode0Behaviors, analysis.go:33-49) -- a fixed,
//      ordered list of strategies, escalating from "cheapest trick" to
//      "give the NAT more time and more packets".
//   2. The analyzer (Analyzer / makeHoleRecords, analysis.go:210-260) --
//      per-pair scores, bumped when a strategy is *reported* to work, so
//      the next round for that pair starts at the entry that worked instead
//      of re-running the whole ladder from the top.
//
// Why this exists here: the relay previously emitted a single hardcoded
// instruction (role=receiver, ttl=7) forever. 135 NatHoleInstructions were
// dispatched for the same E1/E2 pair on 2026-09-27, every one of them
// byte-identical, and none of them could ever have worked on a 12-hop path
// because a TTL-7 probe dies long before the cloud NAT that has to allocate
// the mapping. FRP does not have this failure mode: entries 4 and 5 of the
// ladder send with the socket's normal TTL, so at least one rung works on a
// long path -- and the analyzer is what gets a pair down to it.

// Mirrors DetectRoleSender / DetectRoleReceiver in
// frp-0.71.0/pkg/nathole/analysis.go:15-16. These values are what the Go
// edge sees in NatHoleInstruction.role (pkg/p2p/proto/p2p.proto, NatHoleRole).
export const DetectRoleSender = 0;
export const DetectRoleReceiver = 1;

// Coordination modes. Mode 0 is EasyNAT & EasyNAT (the STUN-discovered
// pub_socket is exact, no port scan); mode 3 is a HardNAT pair, which scans
// a port range around the counterpart's observed port.
export const NAT_HOLE_MODE_EASY_PAIR = 0;
export const NAT_HOLE_MODE_HARD_PAIR = 3;

// Port difference threshold below which a pair is classified EasyNAT.
// Mirrors analysis.go:20.
export const PortsDifferenceThreshold = 5;

// Mode 0 behaviour ladder -- frp-0.71.0/pkg/nathole/analysis.go:33-49.
//
//   lo.T1(...)  only the named role emits a detect packet
//   lo.T2(...)  both roles emit one
//
// We have no T1/T2 distinction: our Go edge always sends from whichever role
// it was assigned (the receiver probes the sender, the sender punches the
// receiver), so both roles always emit. What survives the port is the TTL and
// the send delay, which are the parts that actually change the outcome.
//
// ttl 0 means "do not touch the socket's TTL" -- sendSidMessage guards its
// SetTTL call with `if ttl > 0` (nathole.go:363), so a 0 entry sends a
// normal, full-path packet on both sides.
export const mode0Behaviors = [
  { receiver: { ttl: 7 } },
  { receiver: { ttl: 7 } },
  { sender: { ttl: 4 }, receiver: { ttl: 4 } },
  { receiver: { ttl: 4 }, sender: { ttl: 4 } },
  { sender: {}, receiver: {} },
  { receiver: {}, sender: {} },
  { sender: { sendDelayMs: 5000 }, receiver: {} },
  { sender: { sendDelayMs: 10000 }, receiver: {} },
  { receiver: {}, sender: { sendDelayMs: 5000 } },
  { receiver: {}, sender: { sendDelayMs: 10000 } },
];

// Mode 3 behaviour ladder -- analysis.go:52-66. Only the two entries we
// actually emit are kept; the ladder is only consulted by index, so
// shortening it is safe as long as index 0 still means the same thing.
export const mode3Behaviors = [
  { sender: { portsRangeNumber: 10 }, receiver: { ttl: 7, portsRangeNumber: 10 } },
  { sender: { portsRangeNumber: 10 }, receiver: { ttl: 4, portsRangeNumber: 10 } },
  { sender: { portsRangeNumber: 10 }, receiver: { portsRangeNumber: 10 } },
  { receiver: { ttl: 7, portsRangeNumber: 10 }, sender: { portsRangeNumber: 10 } },
  { receiver: { ttl: 4, portsRangeNumber: 10 }, sender: { portsRangeNumber: 10 } },
  { receiver: { portsRangeNumber: 10 }, sender: { portsRangeNumber: 10 } },
];

/** Behaviours available for a coordination mode. */
export function behaviorsForMode(mode) {
  if (mode === NAT_HOLE_MODE_HARD_PAIR) return mode3Behaviors;
  return mode0Behaviors;
}

// The Go edge skips the low-TTL pre-mapping probe only for these two rungs.
// Kept in step with pkg/p2p/p2p.go natHoleBehaviorNoTTLSenderFirst /
// ...ReceiverFirst, which decide that from NatHoleInstruction.behavior_index.
export const NAT_HOLE_BEHAVIOR_NO_TTL_SENDER_FIRST = 4;
export const NAT_HOLE_BEHAVIOR_NO_TTL_RECEIVER_FIRST = 5;

/**
 * Per-pair strategy scores.
 *
 * Port of makeHoleRecords (analysis.go:210-260). `scores` is indexed by
 * ladder position; all start at the NAT-feature-derived default of 0.
 */
class MakeHoleRecords {
  constructor() {
    this.scores = new Map();
    // Every rung starts present at the neutral default, exactly as
    // makeHoleRecords does when it fills the whole vector from the
    // NAT-feature-derived default. Populating them all up front is what
    // makes a tie-break possible at all: an index that has never been tried
    // is indistinguishable from a rung that was tried and tied, and a rung
    // that is missing from the map can never be recommended later, so a
    // ladder that only grows entries it has scored could never be walked.
    for (let i = 0; i < allLadderIndices(); i++) this.scores.set(i, 0);
  }

  get(index) {
    if (!this.scores.has(index)) this.scores.set(index, 0);
    return this.scores.get(index);
  }

  add(index, delta) {
    const next = this.get(index) + delta;
    // FRP's comment: "record a behavior score, between -10 and 10"
    // (analysis.go:236).
    this.scores.set(index, Math.max(-10, Math.min(10, next)));
  }

  /**
   * The entry to try next: the highest score.
   *
   * analysis.go:243-252. FRP breaks ties by Go map iteration order, which
   * is randomised per iteration, so a never-tried FRP pair effectively
   * samples the ladder at random. We break ties toward the lowest index
   * instead, which is deterministic and, together with the failure penalty
   * in report() below, walks the ladder from the top rather than jumping
   * around it.
   *
   * (FRP's trailing "let the ones who are not the best at the top one by
   * one" loop, analysis.go:254-256, is a no-op: it decrements a copy of the
   * map value rather than the entry, so nothing is written back. It is not
   * reproduced.)
   */
  recommand() {
    let best = 0;
    let bestScore = -Infinity;
    for (const [index, score] of this.scores) {
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    }
    return best;
  }
}

/** Every index either ladder can use. */
function allLadderIndices() {
  return Math.max(mode0Behaviors.length, mode3Behaviors.length);
}

const RESERVE_DURATION_MS = 24 * 60 * 60 * 1000; // 24h, see reserveDuration

/**
 * Per-pair strategy memory.
 *
 * Port of Analyzer (analysis.go:262-300). Keyed by "<macA>|<macB>" (sorted,
 * so the pair is order-independent), which mirrors FRP keying on the
 * client/visitor IP pair: the identity of the two endpoints.
 */
export class NatHoleAnalyzer {
  constructor(now = Date.now()) {
    this.records = new Map();
    this.now = now;
  }

  _record(key) {
    if (!this.records.has(key)) {
      this.records.set(key, {
        makeHoleRecords: new MakeHoleRecords(),
        reserveDuration: this.now + RESERVE_DURATION_MS,
      });
    }
    return this.records.get(key);
  }

  /** The ladder index to use for `key` on this round. */
  recommand(key) {
    return this._record(key).makeHoleRecords.recommand();
  }

  /** Score for one (mode, index); exposed for logging and tests. */
  score(key, index) {
    return this._record(key).makeHoleRecords.get(index);
  }

  /**
   * Record the outcome of a round.
   *
   * FRP parity: analysis.go:237-238, `score += 2` capped at 10, applied
   * when the client reports success (controller.go:271 HandleReport only
   * calls ReportSuccess when m.Success).
   *
   * One deliberate addition: a reported FAILURE demotes the rung that was
   * tried (-1). FRP never does this -- reportSuccess is the only writer of
   * Score in the whole of frp-0.71.0 -- so an FRP pair whose index 0 can
   * never work stays on index 0 forever too. We have a measured case of
   * exactly that (a 12-hop path where a TTL-7 probe cannot open a mapping),
   * and a ladder that cannot be walked down is just a list. -1 is inside the
   * range FRP's own comment reserves, and the cap at -10 keeps a
   * permanently-failing rung from being retried forever once the rest of the
   * ladder is exhausted.
   */
  report(key, index, succeeded) {
    const rec = this._record(key);
    rec.makeHoleRecords.add(index, succeeded ? 2 : -1);
    return rec.makeHoleRecords.get(index);
  }

  /** Drop all records touching `macAddr` (peer left, or reconnected). */
  forgetMAC(macAddr) {
    if (!macAddr) return;
    const needle = String(macAddr).toLowerCase();
    for (const key of this.records.keys()) {
      if (String(key).split("|").some((m) => String(m).toLowerCase() === needle)) {
        this.records.delete(key);
      }
    }
  }

  /** FRP CleanWorker: drop records whose reserve window has passed. */
  clean() {
    for (const [key, rec] of this.records) {
      if (rec.reserveDuration <= this.now) this.records.delete(key);
    }
  }

  get size() {
    return this.records.size;
  }
}

/** Order-independent key for a MAC pair. */
export function pairKeyFor(macA, macB) {
  return [String(macA).toLowerCase(), String(macB).toLowerCase()].sort().join("|");
}
