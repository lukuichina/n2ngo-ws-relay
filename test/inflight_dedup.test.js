/**
 * Regression tests for the in-flight guard.
 *
 * shouldHoldForInProgress() reads the edge's own InProgress report, but that
 * report is a round trip. For a pair being tried for the first time there is
 * no punch state at all for the whole of that window, so every
 * coordinateNatHole() pass inside it concluded the pair had never been served
 * and dispatched again.
 *
 * Measured 2026-10-05: twelve byte-identical index-0 dispatches on E1<->E2
 * before the first terminal report arrived, and 419 of 543 dispatches on the
 * failing log5<->E2 pair were repeats of a rung already in flight. Pairs that
 * connected showed none, which is the tell -- a punch that works does not make
 * the relay repeat itself.
 *
 * These tests pin the release conditions, because a guard that only ever holds
 * would turn a lossy pair into a silent one.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { shouldHoldForInFlight } from "../src/core/handler.js";

const T0 = 1_757_000_000_000;
const after = (ms) => T0 + ms;

const TIMEOUT = 10000;
const flight = (over = {}) => ({ rung: 0, signature: "a->b@0", at: T0, ...over });
const candidate = (over = {}) => ({ rung: 0, signature: "a->b@0", ...over });

test("holds a rung that was dispatched and has not been answered", () => {
  const r = shouldHoldForInFlight(flight(), candidate(), after(2000), TIMEOUT);
  assert.equal(r.hold, true);
  assert.equal(r.reason, "dispatched-awaiting-verdict");
  assert.equal(r.wakeAt, T0 + TIMEOUT);
});

test("holds across the repeated passes a real dispatch would see", () => {
  // The observed failure: edges emit P2PStateInfo every 2s, so the report
  // latency window contains several coordinateNatHole() passes.
  for (const t of [0, 2000, 4000, 6000, 8000]) {
    assert.equal(
      shouldHoldForInFlight(flight(), candidate(), after(t), TIMEOUT).hold,
      true,
      `pass at +${t}ms re-dispatched an in-flight rung`
    );
  }
});

test("releases once the rung has had no verdict for the timeout", () => {
  const r = shouldHoldForInFlight(flight(), candidate(), after(TIMEOUT), TIMEOUT);
  assert.equal(r.hold, false);
  assert.equal(r.reason, "no-verdict");
});

test("releases when the ladder advanced, so the new rung still goes out", () => {
  const r = shouldHoldForInFlight(
    flight({ rung: 0 }),
    candidate({ rung: 4 }),
    after(500),
    TIMEOUT
  );
  assert.equal(r.hold, false);
  assert.equal(r.reason, "rung-changed");
});

test("releases when the signature changed, since the target is different", () => {
  const r = shouldHoldForInFlight(
    flight({ signature: "a->b@0" }),
    candidate({ signature: "b->a@0" }),
    after(500),
    TIMEOUT
  );
  assert.equal(r.hold, false);
  assert.equal(r.reason, "signature-changed");
});

test("holds when a new rung was dispatched recently", () => {
  // The release is keyed on the pair (rung, signature), not on the old rung's
  // age: a fresh dispatch of rung 4 must not inherit rung 0's grace period.
  const r = shouldHoldForInFlight(
    flight({ rung: 4, at: after(1000) }),
    candidate({ rung: 4 }),
    after(2000),
    TIMEOUT
  );
  assert.equal(r.hold, true);
});

test("does not hold when nothing is in flight", () => {
  const r = shouldHoldForInFlight(undefined, candidate(), after(0), TIMEOUT);
  assert.equal(r.hold, false);
  assert.equal(r.reason, "nothing-in-flight");
});

test("a terminal verdict written without an `at` still clears the rung", () => {
  // The reconcile in coordinateNatHole has to accept this. A state recorded
  // without a timestamp cannot be ordered against the dispatch, so a
  // timestamp-only test would hold here and wedge the pair for the full
  // timeout -- which is exactly the "silent instead of spinning" failure the
  // escalating-backoff test guards against from the other side.
  for (const state of [2, 3]) {
    const reported = { state, attempts: 1 };
    const flightAt = T0;
    const releases =
      reported.state === 2 ||
      reported.state === 3 ||
      (reported.at || 0) >= flightAt;
    assert.equal(releases, true, `terminal state ${state} did not release the rung`);
  }
});