/**
 * Regression tests for the punch-success retirement rule.
 *
 * The relay suppresses a pair forever once it records a success, and retires
 * that success when the tunnel it described is gone. Getting the second half
 * wrong is expensive in both directions:
 *
 *  - too tight  → a healthy pair is re-punched on every status transition
 *  - too loose  → a dead pair is suppressed forever and never recovers
 *
 * The 2026-09-29 run had the first bug: it retired on (1,0), (2,0) and (0,2),
 * three times, none of which mean the tunnel is down, while the pair was
 * carrying traffic the whole time.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { shouldRetireSuccess } from "../src/core/handler.js";

const UNKNOWN = 0;
const PENDING = 1;
const AVAILABLE = 2;
const FULL_DUPLEX = 3;
const UNAVAILABLE = 4;

const T0 = 1_757_000_000_000;
const success = (at = T0) => ({ state: 3, at });
const after = (ms) => T0 + ms;

// The exact status pairs the relay logged on 2026-09-29 while the pair was
// up and carrying traffic. None of these mean "the tunnel is down".
const observedFalsePositives = [
  ["1s after a re-registration", PENDING, UNKNOWN],
  ["2s later, sender climbed to Available", AVAILABLE, UNKNOWN],
  ["next round, roles swapped", UNKNOWN, AVAILABLE],
  ["both mid-climb", PENDING, AVAILABLE],
  ["neither side reporting yet", undefined, undefined],
  ["one side full duplex", FULL_DUPLEX, UNKNOWN],
];

for (const [label, sender, receiver] of observedFalsePositives) {
  test(`does not retire: ${label}`, () => {
    assert.equal(shouldRetireSuccess(sender, receiver, success(), after(2000)), false);
  });
}

test("retires when a side reports Unavailable, after the grace period", () => {
  assert.equal(shouldRetireSuccess(UNAVAILABLE, AVAILABLE, success(), after(60000)), true);
  assert.equal(shouldRetireSuccess(AVAILABLE, UNAVAILABLE, success(), after(60000)), true);
});

test("does not retire inside the grace period", () => {
  // A demotion in flight when the success landed reports Unavailable right
  // after it. Retiring there would kill a tunnel that just came up.
  assert.equal(shouldRetireSuccess(UNAVAILABLE, UNAVAILABLE, success(), after(2000)), false);
  assert.equal(shouldRetireSuccess(UNAVAILABLE, FULL_DUPLEX, success(), after(20000)), false);
});

test("does not retire when there is no prior success", () => {
  assert.equal(shouldRetireSuccess(UNAVAILABLE, UNAVAILABLE, undefined, after(60000)), false);
});

test("does not retire a non-success report (a failure is not stale by age)", () => {
  const failure = { state: 2, at: T0 };
  assert.equal(shouldRetireSuccess(UNAVAILABLE, UNAVAILABLE, failure, after(60000)), false);
});

test("a demotion that outlives the grace period still retires", () => {
  // The keepalive path demotes FullDuplex -> relay, and the edge re-punches
  // on its own. Retiring here just lets the relay stop suppressing a pair
  // that is genuinely gone.
  const old = success(T0 - 10 * 60_000);
  assert.equal(shouldRetireSuccess(UNAVAILABLE, UNKNOWN, old, T0), true);
});

// --- 2026-09-30: a keepalive demotion never retires anything -------------
//
// With three nodes up, E1<->E2 stopped working entirely: no unicast forward
// between them ever reached the relay, and coordinateNatHole logged zero
// `retired a stale success` across 239 scheduled rounds. The pair had punched
// successfully 736 times, every one of them on ladder rung 0, and that
// success was still sitting in natHolePunchState at the end of the log.
//
// The cause: the demotion writes P2PAvailable(2), not P2PUnavailable(4), so
// the old `status !== UNAVAILABLE` test never fired. The `state === 3` gate in
// coordinateNatHole then `continue`d the pair forever and no instruction was
// ever emitted for it again.
test("retires when BOTH sides have demoted to Available, after the grace", () => {
  const old = success(T0 - 10 * 60_000);
  assert.equal(shouldRetireSuccess(AVAILABLE, AVAILABLE, old, T0), true);
});

test("retires when both sides have fallen off FullDuplex entirely", () => {
  const old = success(T0 - 10 * 60_000);
  assert.equal(shouldRetireSuccess(UNKNOWN, UNKNOWN, old, T0), true);
  assert.equal(shouldRetireSuccess(PENDING, UNKNOWN, old, T0), true);
  assert.equal(shouldRetireSuccess(UNAVAILABLE, UNAVAILABLE, old, T0), true);
});

test("keeps a success only while BOTH sides are still FullDuplex", () => {
  // Retirement is symmetric on purpose. A one-sided demotion means the far end
  // is no longer confirming the tunnel, and that edge demotes too once its own
  // keepalive expires -- so waiting for the second demotion only delays the
  // re-punch by one keepalive timeout. Gating on "either side is up" instead
  // would leave the original bug alive for every pair where only one edge
  // notices the drop first, which is exactly the 2026-09-30 E1<->E2 case.
  const old = success(T0 - 10 * 60_000);
  assert.equal(shouldRetireSuccess(FULL_DUPLEX, FULL_DUPLEX, old, T0), false);
  assert.equal(shouldRetireSuccess(FULL_DUPLEX, AVAILABLE, old, T0), true);
  assert.equal(shouldRetireSuccess(AVAILABLE, FULL_DUPLEX, old, T0), true);
});

test("a two-sided demotion inside the grace period is still held", () => {
  assert.equal(shouldRetireSuccess(AVAILABLE, AVAILABLE, success(), after(2000)), false);
});
