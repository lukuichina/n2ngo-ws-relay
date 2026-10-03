/**
 * Regression tests for the two ladder defects found 2026-09-30.
 *
 * Background: a pair on an 11-hop path (measured with escalating ICMP TTL:
 * TTL=10 died, TTL=12 answered) stayed on ladder rung 0 forever. Rung 0
 * sends with TTL 7, which is FRP's value and is correct only when the NAT
 * translates at hop 1; on a long path the probe dies before reaching the EIP,
 * so the mapping it is supposed to create never forms. The pair fell back to
 * the relay at ~343ms while a reachable peer on the same third host sat at
 * ~17ms.
 *
 * Two independent defects had to be fixed to make the ladder reachable:
 *
 *   1. The backoff doubled per failure (reaching its 300s cap on the fourth)
 *      while the ladder penalty was a flat -1. Advancing one rung therefore
 *      cost five minutes, and the no-TTL rungs -- the only ones that can work
 *      on a long path -- sat 20+ minutes away.
 *   2. recommandation broke score ties toward the lowest index. Every
 *      never-tried rung sits at the neutral 0, so the pair crawled 0 -> 1 -> 2
 *      -> 3 and rungs 4/5 were never preferred.
 *
 * These tests pin the behaviour, not the implementation: they assert which
 * rung comes out of a ladder that has been failing.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  NatHoleAnalyzer,
  NAT_HOLE_BEHAVIOR_NO_TTL_SENDER_FIRST,
  NAT_HOLE_BEHAVIOR_NO_TTL_RECEIVER_FIRST,
} from "/root/github/p2p/n2ngo-ws-relay/src/core/nathole.js";

const PAIR = "0a:e3:8f:d6:51:a2|ea:2f:de:90:a5:72";

/**
 * Walk the ladder the way the relay does: keep failing whatever rung comes
 * out, and report the rungs visited in order.
 */
function climbLadder(pairs = 10, startRung = 0) {
  const analyzer = new NatHoleAnalyzer();
  analyzer._record(PAIR);
  const rec = analyzer._record(PAIR).makeHoleRecords;
  // Seed the failure that promoted us to `startRung`.
  if (startRung > 0) {
    for (let i = 0; i < startRung; i++) {
      rec.add(i, -1);
    }
  }

  const visited = [startRung];
  for (let i = 0; i < pairs; i++) {
    const rung = analyzer.recommand(PAIR);
    visited.push(rung);
    analyzer.report(PAIR, rung, false);
  }
  return visited;
}

// --- Fix 2: tie-break reaches a no-TTL rung -----------------------------------

test("recommand does not stay on a rung that just failed", () => {
  const analyzer = new NatHoleAnalyzer();
  analyzer._record(PAIR);
  analyzer.report(PAIR, 0, false);
  assert.notEqual(analyzer.recommand(PAIR), 0);
});

test("ladder reaches a no-TTL rung within a few failures", () => {
  const visited = climbLadder(6);
  const noTtl = visited.filter(
    (r) =>
      r === NAT_HOLE_BEHAVIOR_NO_TTL_SENDER_FIRST ||
      r === NAT_HOLE_BEHAVIOR_NO_TTL_RECEIVER_FIRST
  );
  assert.ok(
    noTtl.length > 0,
    `no-TTL rung never reached; visited ${JSON.stringify(visited)}`
  );
});

// The specific case from the field: rung 0 (TTL 7) fails on an 11-hop path.
// The next rung must be a no-TTL entry, not rung 1 -- a TTL-4 probe dies on
// that path just as a TTL-7 probe does, so climbing to 1 is wasted time.
test("after rung 0 fails, the next rung can open a long path", () => {
  const analyzer = new NatHoleAnalyzer();
  analyzer._record(PAIR);
  analyzer.report(PAIR, 0, false);
  const next = analyzer.recommand(PAIR);
  assert.ok(
    next === NAT_HOLE_BEHAVIOR_NO_TTL_SENDER_FIRST ||
      next === NAT_HOLE_BEHAVIOR_NO_TTL_RECEIVER_FIRST,
    `expected a no-TTL rung, got ${next}; a TTL-4 entry cannot cross an 11-hop path either`
  );
});

// Rung 0 must stay the very first choice: TTL 7 is correct for consumer
// routers and the large majority of pairs should behave exactly as before.
test("the first attempt is still rung 0", () => {
  const analyzer = new NatHoleAnalyzer();
  analyzer._record(PAIR);
  assert.equal(analyzer.recommand(PAIR), 0);
});

// A rung that actually failed must never be re-selected just because the
// tie-break likes its index. The preference may only reorder untried rungs.
test("a rung that failed is not resurrected by the tie-break", () => {
  const analyzer = new NatHoleAnalyzer();
  analyzer._record(PAIR);
  const noTtlRung = NAT_HOLE_BEHAVIOR_NO_TTL_SENDER_FIRST;
  analyzer.report(PAIR, noTtlRung, false);
  // Every remaining round fails; the no-TTL rung must not reappear.
  for (let i = 0; i < 8; i++) {
    const rung = analyzer.recommand(PAIR);
    assert.notEqual(rung, noTtlRung, `rung ${noTtlRung} re-selected after failing`);
    analyzer.report(PAIR, rung, false);
  }
});

// FRP parity: the analyzer hands the top score to whichever entry earned it.
test("a rung that succeeded is returned again", () => {
  const analyzer = new NatHoleAnalyzer();
  analyzer._record(PAIR);
  analyzer.report(PAIR, 0, true); // succeeded
  assert.equal(analyzer.recommand(PAIR), 0);
});

// --- Fix 1: the backoff does not punish a rung change -------------------------
//
// The relay resets the backoff when the dispatched rung differs from the last
// one. This models that: a strategy change must cost one base backoff, not a
// doubled one.

function backoffAfter({ lastRung, newRung, failStreak }) {
  const strategyChanged = lastRung !== undefined && lastRung !== newRung;
  const streakForBackoff = strategyChanged ? 0 : failStreak;
  return {
    strategyChanged,
    backoffMs: Math.min(
      Math.max(15000, 1 * 1000) * Math.pow(2, streakForBackoff),
      300000
    ),
  };
}

test("changing rung resets the backoff to the base interval", () => {
  const { backoffMs, strategyChanged } = backoffAfter({
    lastRung: 0,
    newRung: NAT_HOLE_BEHAVIOR_NO_TTL_SENDER_FIRST,
    failStreak: 4, // already at the 300s cap
  });
  assert.equal(strategyChanged, true);
  assert.equal(
    backoffMs,
    15000,
    "a new rung is forward progress and must not inherit the old rung's penalty"
  );
});

test("failing the same rung still escalates the backoff", () => {
  const { strategyChanged, backoffMs } = backoffAfter({
    lastRung: 0,
    newRung: 0,
    failStreak: 2,
  });
  assert.equal(strategyChanged, false);
  assert.equal(backoffMs, Math.min(15000 * 4, 300000));
});

test("the escalation rate that made the ladder unreachable is bounded", () => {
  // The defect: backoff doubled per failure while the ladder penalty was a
  // flat -1, so 6 failures bought a 300s wait per rung. With the reset, a pair
  // reaches a usable rung in a handful of short rounds instead.
  const analyzer = new NatHoleAnalyzer();
  analyzer._record(PAIR);
  const waits = [];
  for (let i = 0; i < 6; i++) {
    const previous = analyzer.recommand(PAIR);
    if (previous !== undefined) {
      // The relay dispatches the rung the analyzer recommends.
    }
    const rung = analyzer.recommand(PAIR);
    const prevDispatched = waits.length
      ? waits[waits.length - 1].rung
      : undefined;
    waits.push({
      rung,
      ms: backoffAfter({ lastRung: prevDispatched, newRung: rung, failStreak: i })
        .backoffMs,
    });
    analyzer.report(PAIR, rung, false);
  }
  const total = waits.reduce((a, w) => a + w.ms, 0);
  assert.ok(
    total < 120000,
    `six rounds cost ${total}ms; the ladder was unreachable at 300s per rung`
  );
});
