/**
 * Regression test for the backoff gate in PacketHandler.coordinateNatHole().
 *
 * ladder_longpath.test.mjs models the backoff arithmetic. That proves the
 * arithmetic is right but not that the relay applies it -- and the original
 * defect was a wiring problem, not an arithmetic one: the re-arm at the top of
 * the loop wrote a fresh, heavily-penalised backoff using the OLD rung's
 * signature, and the "new signature resets to 15s" rule below it then saw a
 * matching signature and doubled again. No test of the arithmetic would have
 * caught that; only reading the function did.
 *
 * So this test drives the real PacketHandler.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { PacketHandler } from "/root/github/p2p/n2ngo-ws-relay/src/core/handler.js";

const E1 = "0a:e3:8f:d6:51:a2";
const E3 = "ea:2f:de:90:a5:72";
const PAIR_KEY = `${E1}|${E3}`;

/**
 * Build a PacketHandler holding exactly one punchable pair, with the ladder
 * pinned to a scripted sequence of rungs.
 */
function makeHandler({ rungs, relaying }) {
  const handler = new PacketHandler({}, { communityManager: {} });

  // isCoordEligible (handler.js:364) requires: online, natType HardNAT or
  // EasyNAT, an entry in p2pInfos, and a p2pEndpoint. All three of the deployed
  // edges report EasyNAT / BehaviorNoChange / Public=false, which is the
  // 1:1 cloud NAT that produced the stuck pair.
  const peer = (macAddr, pubSocket) => ({
    macAddr,
    online: true,
    natType: "EasyNAT",
    natBehavior: "BehaviorNoChange",
    natPublic: false,
    pubSocket,
    p2pEndpoint: pubSocket,
    observedRaddr: pubSocket,
    p2pAvailable: true,
    p2pState: 0,
  });

  const online = [peer(E1, "2.58.196.38:36267"), peer(E3, "111.101.5.1:64315")];
  const p2pInfos = new Map(
    online.map((p) => [p.macAddr, { macAddr: p.macAddr, p2pEndpoint: p.p2pEndpoint }])
  );
  const commState = {
    getOnlinePeers: () => online,
    p2pInfos,
  };

  // Pin the ladder: each call to recommand() yields the next scripted rung.
  const queue = rungs.slice();
  handler.natHoleAnalyzer.recommand = () => (queue.length ? queue.shift() : 0);

  return { handler, commState, relaying };
}

/**
 * Dispatch, fail the round, dispatch again, and report what backoff the second
 * dispatch left behind.
 */
function backoffAfterRungChange({ firstRung, nextRung, failStreak = 3, attempts = 4 }) {
  const { handler, commState, relaying } = makeHandler({
    rungs: [firstRung, nextRung],
  });

  handler.coordinateNatHole(commState);
  const first = handler.natHoleBackoff.get(PAIR_KEY);
  assert.ok(first, "first dispatch recorded no backoff");

  // The pair reports the round burned out.
  handler.natHolePunchState.set(PAIR_KEY, { state: 2, attempts });
  handler._failCounts.set(PAIR_KEY, failStreak);

  handler.coordinateNatHole(commState);
  return { first, after: handler.natHoleBackoff.get(PAIR_KEY) };
}

test("changing rung re-arms without the old rung's penalty", () => {
  // The field case: E1<->E3 on an 11-hop path, rung 0 (TTL 7) fails four
  // times. The old code hands rung 4 a 300s wait, so the pair never reaches it.
  const { after } = backoffAfterRungChange({ firstRung: 0, nextRung: 4 });

  assert.ok(after, "second dispatch recorded no backoff");
  assert.ok(
    after.backoffMs <= 30000,
    `backoff after a rung change is ${after.backoffMs}ms; a new rung must not ` +
      "inherit the old rung's penalty, or the ladder can never be walked"
  );
});

test("a long failure streak does not carry over a rung change", () => {
  // A pair that has been failing for many rounds would sit at the 300s cap
  // under the old rule. Climbing a rung has to be cheap regardless of history.
  const { after } = backoffAfterRungChange({
    firstRung: 0,
    nextRung: 5,
    failStreak: 8,
    attempts: 12,
  });
  assert.ok(after.backoffMs <= 30000, `backoff was ${after.backoffMs}ms`);
});

test("repeating the same rung still escalates", () => {
  // A pair that can never punch must back off, not spin at 15s forever.
  const { after } = backoffAfterRungChange({
    firstRung: 0,
    nextRung: 0,
    failStreak: 2,
  });
  assert.ok(
    after.backoffMs > 15000,
    `backoff did not escalate on a repeated rung (${after.backoffMs}ms); ` +
      "an unpunchable pair would then spin"
  );
});

test("the whole ladder is walkable without a five-minute wait per rung", () => {
  // Drive the pair through the ladder the way the analyzer actually drives it:
  // one round per rung, climbing on every failure. The 5th entry is no-TTL and
  // is the only one that can open a mapping across an 11-hop path.
  //
  // Note the shape of the fix. A rung that keeps failing still backs off --
  // that is what stops an unpunchable pair from spinning -- so this scenario
  // deliberately never repeats a rung. What it pins is that *climbing* is
  // cheap: under the defect each of these six rounds cost up to 300s, which is
  // why the pair was still on rung 0 half an hour after the path was found to
  // be too long for TTL 7.
  const script = [0, 1, 2, 3, 4, 5];
  const { handler, commState } = makeHandler({ rungs: script.slice() });

  const waits = [];
  for (let round = 0; round < script.length; round++) {
    handler.coordinateNatHole(commState);
    const entry = handler.natHoleBackoff.get(PAIR_KEY);
    if (entry) waits.push(entry.backoffMs);
    handler.natHolePunchState.set(PAIR_KEY, { state: 2, attempts: round + 1 });
    handler._failCounts.set(PAIR_KEY, round);
  }

  const total = waits.reduce((a, b) => a + b, 0);
  assert.ok(
    total < 300000,
    `walking the ladder cost ${total}ms across ${waits.length} rounds; ` +
      "300s per rung is what made rungs 4/5 unreachable"
  );

  // Every climb must land on the base interval, not merely stay under the
  // ceiling -- a 290s wait would pass the assertion above while still being
  // unusable.
  const climbs = waits.filter((ms) => ms === 15000);
  assert.ok(
    climbs.length >= 5,
    `only ${climbs.length} of ${waits.length} rounds hit the 15s base interval; ` +
      "each rung change should reset the backoff"
  );
});


// --- The re-arm must not write a backoff for a rung that is no longer current
//
// There are two writes to natHoleBackoff per dispatch: the re-arm at the top
// of the loop (which escalates hard when a round just failed) and the dispatch
// itself (which resets to 15s on a signature change). They used to disagree --
// the re-arm wrote the OLD rung's signature together with a 300s wait, and the
// dispatch then compared against that fresh entry, saw its own signature, and
// doubled it again. Each fix alone masks the other, so this test pins the
// invariant directly: after any dispatch, the stored backoff must be one the
// CURRENT signature can justify.

test("the stored backoff is always one the current rung can justify", () => {
  const script = [0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0, 0];
  const { handler, commState } = makeHandler({ rungs: script.slice() });

  for (let round = 0; round < script.length; round++) {
    handler.coordinateNatHole(commState);
    const entry = handler.natHoleBackoff.get(PAIR_KEY);
    assert.ok(entry, `round ${round}: no backoff recorded`);

    // A rung change resets to the 15s base; only a repeat of the same rung may
    // escalate, and only up to the 5-minute cap.
    const rungChanged = round > 0 && script[round] !== script[round - 1];
    if (rungChanged) {
      assert.equal(
        entry.backoffMs,
        15000,
        `round ${round} changed rung ${script[round - 1]} -> ${script[round]} ` +
          `but recorded ${entry.backoffMs}ms`
      );
    } else {
      assert.ok(
        entry.backoffMs <= 300000,
        `round ${round}: backoff ${entry.backoffMs}ms exceeds the 5-minute cap`
      );
    }

    handler.natHolePunchState.set(PAIR_KEY, { state: 2, attempts: round + 1 });
    handler._failCounts.set(PAIR_KEY, round);
  }
});

test("climbing the ladder in both directions stays cheap", () => {
  // Going back down the ladder happens whenever a rung that used to work stops
  // working -- a STUN port change, a NAT rebind. It has to be as cheap as
  // climbing, or the pair re-walks the ladder at 300s a step.
  const { handler, commState } = makeHandler({ rungs: [0, 1, 2, 3, 4, 3, 2, 1, 0] });

  const waits = [];
  for (let round = 0; round < 9; round++) {
    handler.coordinateNatHole(commState);
    const entry = handler.natHoleBackoff.get(PAIR_KEY);
    if (entry) waits.push(entry.backoffMs);
    handler.natHolePunchState.set(PAIR_KEY, { state: 2, attempts: round + 1 });
    handler._failCounts.set(PAIR_KEY, round);
  }
  const escalations = waits.filter((ms) => ms !== 15000);
  assert.deepEqual(
    escalations,
    [],
    `re-descending the ladder escalated the backoff: ${JSON.stringify(waits)}`
  );
});
