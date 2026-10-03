/**
 * Regression tests for the InProgress hold.
 *
 * InProgress(1) means "a round started, no verdict yet" — not "this pair is
 * failing". The relay used to treat it as ordinary news and emit a fresh
 * instruction on every inbound P2PStateInfo (edges send one every 2s).
 *
 * On 2026-10-03 that produced 45 byte-identical instructions at a flat 2s
 * cadence over 90 seconds, on a pair that was already FullDuplex on both
 * sides. Each round's InProgress overwrote the recorded success, so the
 * success gate missed on the next pass and re-dispatched; the edge receiving
 * that instruction opened another round and reported InProgress again.
 *
 * Holding on InProgress cuts the loop: the terminal report (2 or 3) drives
 * the next decision instead of a second instruction landing mid-round.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { shouldHoldForInProgress } from "../src/core/handler.js";

const T0 = 1_757_000_000_000;
const after = (ms) => T0 + ms;

const inProgress = (at = T0) => ({ state: 1, at });
const succeeded = (at = T0) => ({ state: 3, at });
const failed = (at = T0) => ({ state: 2, at });

const TIMEOUT = 60000;

test("holds while a round is genuinely in flight", () => {
  const r = shouldHoldForInProgress(inProgress(T0), after(2000), TIMEOUT);
  assert.equal(r.hold, true);
  assert.equal(r.reason, "round-in-flight");
});

test("hands back the round's own deadline as the wake time", () => {
  const r = shouldHoldForInProgress(inProgress(T0), after(2000), TIMEOUT);
  assert.equal(r.wakeAt, T0 + TIMEOUT);
});

test("keeps holding across a long but still-refreshing round", () => {
  // The edge refreshes `at` once per attempt, so a slow round reports
  // continuously. Each fresh report buys another full window.
  let at = T0;
  for (let i = 0; i < 5; i++) {
    const r = shouldHoldForInProgress(inProgress(at), after(9000), TIMEOUT);
    assert.equal(r.hold, true, `attempt ${i} should still be held`);
    at = after(9000); // the edge refreshed its report
  }
});

test("does not hold on a recorded success — that path already continues", () => {
  const r = shouldHoldForInProgress(succeeded(T0), after(2000), TIMEOUT);
  assert.equal(r.hold, false);
  assert.equal(r.reason, "not-in-progress");
});

test("does not hold on a recorded failure — the re-arm path owns it", () => {
  const r = shouldHoldForInProgress(failed(T0), after(2000), TIMEOUT);
  assert.equal(r.hold, false);
  assert.equal(r.reason, "not-in-progress");
});

test("does not hold when nothing has been recorded yet", () => {
  const r = shouldHoldForInProgress(undefined, after(2000), TIMEOUT);
  assert.equal(r.hold, false);
  assert.equal(r.reason, "not-in-progress");
});

test("releases a stalled round so the pair cannot be stranded", () => {
  // An edge that stops reporting and never produces a terminal state must
  // not hold the pair forever.
  const r = shouldHoldForInProgress(inProgress(T0), after(TIMEOUT), TIMEOUT);
  assert.equal(r.hold, false);
  assert.equal(r.reason, "stalled");
});

test("holds right up to the timeout boundary, releases past it", () => {
  assert.equal(
    shouldHoldForInProgress(inProgress(T0), after(TIMEOUT - 1), TIMEOUT).hold,
    true
  );
  assert.equal(
    shouldHoldForInProgress(inProgress(T0), after(TIMEOUT), TIMEOUT).hold,
    false
  );
});

test("treats a missing timestamp as stalled rather than holding forever", () => {
  const r = shouldHoldForInProgress({ state: 1 }, after(2000), TIMEOUT);
  assert.equal(r.hold, false);
  assert.equal(r.reason, "stalled");
});

test("the 2s loop this breaks: alternating success and in-progress holds", () => {
  // The exact relay sequence observed on 2026-10-03. Every InProgress must
  // now hold, so the pair is dispatched once instead of 45 times.
  let held = 0;
  let dispatched = 0;
  const pairs = [
    succeeded(T0),
    inProgress(T0),
    succeeded(T0),
    inProgress(T0),
    inProgress(T0),
  ];
  for (const reported of pairs) {
    if (shouldHoldForInProgress(reported, after(2000), TIMEOUT).hold) held++;
    else dispatched++;
  }
  assert.equal(held, 3, "each in-progress in the loop must hold");
  assert.equal(dispatched, 2, "only the two successes are not in-progress");
});

test("a terminal report releases the hold immediately", () => {
  // The round ends: the edge reports its verdict, and the very next
  // coordination pass must be able to act on it.
  const stalled = shouldHoldForInProgress(inProgress(T0), after(2000), TIMEOUT);
  assert.equal(stalled.hold, true);

  const afterSuccess = shouldHoldForInProgress(succeeded(after(2000)), after(4000), TIMEOUT);
  assert.equal(afterSuccess.hold, false, "success must not hold — it continues above");

  const afterFailure = shouldHoldForInProgress(failed(after(2000)), after(4000), TIMEOUT);
  assert.equal(afterFailure.hold, false, "failure must reach the re-arm path");
});