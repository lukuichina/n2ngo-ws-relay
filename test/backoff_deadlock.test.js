/**
 * Regression tests for the NAT-hole backoff deadlock.
 *
 * The field symptom: a pair stuck on relay for 13+ minutes. The relay log
 * showed three consecutive "re-armed after failure (backoff=60000ms)" lines
 * and no "scheduled" line after any of them. The edge log showed its last
 * punch at 03:53:30 and nothing after, while the process stayed alive.
 *
 * One defect: no wake.
 *
 * coordinateNatHole() only runs when a P2PStateInfo arrives (handler.js:464
 * states this explicitly). An edge that is waiting for an instruction punches
 * nothing and therefore reports nothing. So once the backoff gate suppressed a
 * pass, nothing remained that would ever look at the window again: it expired
 * silently and the pair was never re-decided.
 *
 * The escalating schedule is fine as written and is deliberately not asserted
 * here. An earlier version of this file also claimed the `state === 2` branch
 * reset the window to now+cap on every pass, making the backoff self-
 * perpetuating. Measurement contradicted that: _failStreak() counts DISTINCT
 * failure reports, so re-reading the same state===2 record leaves it at 0 and
 * the window sits at a steady 15s instead of climbing. A test built on that
 * theory passed against the unfixed code, which is how the claim was caught.
 * Only the wake -- the part that actually reproduces the field stall -- is
 * asserted.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const A = "aa:bc:3a:74:37:b1";
const B = "0a:e3:8f:d6:51:a2";

/**
 * Builds a handler wired to a commState with two online peers, plus a stub
 * relayRoom that records every wake arm. jest/node:test cannot await a real
 * Durable Object alarm, so the arm is captured and driven by the test.
 */
function makeHarness(mod, { p2pStatus = 2 } = {}) {
  const { PacketHandler } = mod;
  const wakes = [];
  const logs = [];
  const origLog = console.log;
  console.log = (...a) => logs.push(a.join(" "));

  // The constructor is (env, relayRoom) -- not (relayRoom, env). Passing them
  // the other way round leaves this.relayRoom undefined, and the wake under
  // test is guarded by exactly that check, so every wake assertion would fail
  // for a reason that has nothing to do with the code being tested.
  const relayRoom = {
    communityManager: {},
    async armStaggerWake(at) {
      wakes.push(at);
    },
  };

  const handler = new PacketHandler({}, relayRoom);

  // isCoordEligible() requires: online, a recognised NAT type, an entry in
  // p2pInfos, and a P2P endpoint. A peer missing any of these is skipped
  // before the backoff logic runs, which would make these tests pass
  // vacuously.
  const peer = (mac, vip) => ({
    macAddr: mac,
    virtualIp: vip,
    online: true,
    pubSocket: `${vip === "100.64.0.1" ? "198.51.100.10" : "203.0.113.20"}:40000`,
    p2pStatus: p2pStatus,
    natType: "EasyNAT",
    p2pEndpoint: `${vip === "100.64.0.1" ? "198.51.100.10" : "203.0.113.20"}:41000`,
  });

  const peers = new Map([
    [A, peer(A, "100.64.0.1")],
    [B, peer(B, "100.64.0.2")],
  ]);

  const commState = {
    name: "myc",
    peers,
    p2pInfos: new Map([
      [A, { macAddr: A, pubSocket: "198.51.100.10:40000" }],
      [B, { macAddr: B, pubSocket: "203.0.113.20:40000" }],
    ]),
    virtualIP: { getPeerMAC: () => null },
    getOnlinePeers() {
      return [...this.peers.values()].filter((p) => p.online);
    },
  };

  // coordinateNatHole() keys the pair as the sorted (lower-cased) MAC pair, so
// the real key runs 0a:e3... before aa:bc..., i.e. B|A. Getting this backwards
// makes the tests pass vacuously: the pair is then simply absent from the
// backoff map and every assertion below is trivially true.
const pairKey = `${B}|${A}`;

  return {
    handler,
    commState,
    wakes,
    logs,
    pairKey,
    restore: () => {
      console.log = origLog;
    },
    setFailed: (attempts = 5) => {
      for (const key of [pairKey, `${B}|${A}`]) {
        handler.natHolePunchState.set(key, {
          state: 2,
          attempts,
          detail: "",
          at: Date.now(),
          behaviorIndex: 0,
        });
      }
    },
    rearmed: () => logs.filter((l) => l.includes("re-armed after failure")),
    scheduled: () => logs.filter((l) => l.includes(" scheduled ")),
  };
}

const load = async () => await import("../src/core/handler.js");

test("a suppressed pass arms a wake for the backoff deadline (defect 2)", async () => {
  const mod = await load();
  const h = makeHarness(mod);
  try {
    h.handler.natHoleBackoff.clear();
    h.setFailed(5);

    // The first pass after a failure both re-arms and dispatches: the state
    // record said "failed", which resets the escalating window, so the gate
    // lets it through. A window is now in force.
    h.handler.coordinateNatHole(h.commState);
    const armed = h.handler.natHoleBackoff.get(h.pairKey);
    assert.ok(armed && armed.nextAllowedAt > Date.now(), "a window must be armed");
    h.wakes.length = 0;

    // Drop the failure record. While it stands, every pass re-enters the
    // state===2 branch (which re-arms and dispatches), and the backoff gate is
    // never reached -- so the wake under test belongs to the gate path only.
    h.handler.natHolePunchState.clear();
    h.wakes.length = 0;

    // Now the pair is merely inside its backoff window: no failure to
    // re-arm, so the gate must suppress it. Each such pass must leave a wake
    // behind, or the expiring window is never noticed -- the field stall.
    for (let i = 0; i < 3; i++) {
      h.handler.coordinateNatHole(h.commState);
    }

    assert.equal(
      h.scheduled().length,
      0,
      "passes inside the backoff window must not dispatch"
    );
    assert.ok(
      h.wakes.length > 0,
      "a suppressed pass must arm a wake, or the window expires unnoticed"
    );

    const deadline = h.handler.natHoleBackoff.get(h.pairKey).nextAllowedAt;
    for (const w of h.wakes) {
      assert.ok(
        w <= deadline + 1,
        `wake at ${w} is later than the backoff deadline ${deadline}`
      );
    }
  } finally {
    h.restore();
  }
});

test("after the window expires the pair dispatches again (deadlock broken)", async () => {
  const mod = await load();
  const h = makeHarness(mod);
  try {
    h.handler.natHoleBackoff.clear();
    h.setFailed(5);
    h.handler.coordinateNatHole(h.commState);

    // Clear the record so the state===2 branch stops re-arming, then expire
    // the window: this is the state the alarm wake would produce.
    h.handler.natHolePunchState.clear();
    const entry = h.handler.natHoleBackoff.get(h.pairKey);
    entry.nextAllowedAt = Date.now() - 1;

    const before = h.scheduled().length;
    h.handler.coordinateNatHole(h.commState);

    assert.ok(
      h.scheduled().length > before,
      "an expired window must let the pair be scheduled again; this is the " +
        "step that never ran in the field"
    );
  } finally {
    h.restore();
  }
});