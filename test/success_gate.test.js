/**
 * Tests for the data-plane gate on a reported hole-punch success.
 *
 * The relay is the only component that sees both ends of a pair at once, so it
 * is the only place a reported PunchStateSucceeded can be checked against the
 * other side before it is banked. Banking an uncorroborated success clears the
 * backoff, credits the strategy analyzer, and makes coordinateNatHole's
 * `reported.state === 3` gate stop emitting instructions for the pair —
 * and shouldRetireSuccess() cannot undo it promptly, because it only runs on
 * an inbound P2PStateInfo from a peer that already believes the tunnel is up.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { shouldAcceptSuccess, statusOfPeer } from "../src/core/handler.js";

const P2P_FULLDUPLEX = 3;
const P2P_AVAILABLE = 2;
const P2P_UNKNOWN = 0;

test("shouldAcceptSuccess: a success with no corroboration is refused", () => {
  assert.equal(shouldAcceptSuccess(3, P2P_AVAILABLE, P2P_AVAILABLE), false);
  assert.equal(shouldAcceptSuccess(3, P2P_AVAILABLE, undefined), false);
  assert.equal(shouldAcceptSuccess(3, undefined, undefined), false);
  assert.equal(shouldAcceptSuccess(3, P2P_UNKNOWN, P2P_UNKNOWN), false);
});

test("shouldAcceptSuccess: either side claiming FullDuplex is enough", () => {
  // A promotion is per-edge, so one end can legitimately be a tick behind.
  assert.equal(shouldAcceptSuccess(3, P2P_FULLDUPLEX, P2P_AVAILABLE), true);
  assert.equal(shouldAcceptSuccess(3, P2P_AVAILABLE, P2P_FULLDUPLEX), true);
  assert.equal(shouldAcceptSuccess(3, P2P_FULLDUPLEX, P2P_FULLDUPLEX), true);
});

test("shouldAcceptSuccess: non-success states pass through untouched", () => {
  // 0 is filtered by the caller; 1 and 2 must reach the normal paths.
  assert.equal(shouldAcceptSuccess(1, P2P_AVAILABLE, P2P_AVAILABLE), true);
  assert.equal(shouldAcceptSuccess(2, P2P_AVAILABLE, P2P_AVAILABLE), true);
});

test("statusOfPeer: reads the partner's row inside the reporter's `to` list", () => {
  // p2pInfos is keyed by the reporting edge; a side's status toward its peer
  // is not the peer's own entry. Reading a top-level p2pStatus returns
  // undefined forever, which is what silently disabled the gate before.
  const p2pInfos = new Map([
    [
      "0a:e3:8f:d6:51:a2",
      {
        from: { macAddr: "0a:e3:8f:d6:51:a2" },
        to: [
          { macAddr: "aa:bc:3a:74:37:b1", p2pStatus: P2P_FULLDUPLEX },
          { macAddr: "52:eb:72:ed:64:1f", p2pStatus: P2P_AVAILABLE },
        ],
      },
    ],
    [
      "aa:bc:3a:74:37:b1",
      {
        from: { macAddr: "aa:bc:3a:74:37:b1" },
        to: [{ macAddr: "0a:e3:8f:d6:51:a2", p2pStatus: P2P_AVAILABLE }],
      },
    ],
  ]);

  assert.equal(
    statusOfPeer(p2pInfos, "0a:e3:8f:d6:51:a2", "aa:bc:3a:74:37:b1"),
    P2P_FULLDUPLEX
  );
  assert.equal(
    statusOfPeer(p2pInfos, "0a:e3:8f:d6:51:a2", "52:eb:72:ed:64:1f"),
    P2P_AVAILABLE
  );
  // The reverse direction disagrees — this asymmetry is exactly the case the
  // gate exists to notice.
  assert.equal(
    statusOfPeer(p2pInfos, "aa:bc:3a:74:37:b1", "0a:e3:8f:d6:51:a2"),
    P2P_AVAILABLE
  );
});

test("statusOfPeer: unknown reporter, unknown peer and malformed rows", () => {
  const p2pInfos = new Map([
    ["aa:bc:3a:74:37:b1", { from: {}, to: [{ macAddr: "0a:e3:8f:d6:51:a2" }] }],
  ]);

  assert.equal(statusOfPeer(p2pInfos, "99:99:99:99:99:99", "aa:bc:3a:74:37:b1"), undefined);
  assert.equal(statusOfPeer(p2pInfos, "aa:bc:3a:74:37:b1", "99:99:99:99:99:99"), undefined);
  // A row with no status field reads as undefined, not as 0.
  assert.equal(statusOfPeer(p2pInfos, "aa:bc:3a:74:37:b1", "0a:e3:8f:d6:51:a2"), undefined);
  // Malformed entries must not throw.
  assert.equal(
    statusOfPeer(
      new Map([["aa:bc:3a:74:37:b1", { from: {}, to: [null, undefined, 7] }]]),
      "aa:bc:3a:74:37:b1",
      "0a:e3:8f:d6:51:a2"
    ),
    undefined
  );
  assert.equal(statusOfPeer(undefined, "aa:bc:3a:74:37:b1", "0a:e3:8f:d6:51:a2"), undefined);
  assert.equal(
    statusOfPeer(new Map([["aa:bc:3a:74:37:b1", { from: {}, to: "nope" }]]),
      "aa:bc:3a:74:37:b1",
      "0a:e3:8f:d6:51:a2"
    ),
    undefined
  );
});

test("end-to-end: the gate reads both directions out of one peer's report", () => {
  // Reproduces E1<->E2 as the relay saw it on 2026-10-03: the edge reports the
  // punch succeeded while the only status on record is Available on both
  // sides, because the pair is pinned to the relay.
  const p2pInfos = new Map([
    [
      "0a:e3:8f:d6:51:a2",
      { from: {}, to: [{ macAddr: "aa:bc:3a:74:37:b1", p2pStatus: P2P_AVAILABLE }] },
    ],
    [
      "aa:bc:3a:74:37:b1",
      { from: {}, to: [{ macAddr: "0a:e3:8f:d6:51:a2", p2pStatus: P2P_AVAILABLE }] },
    ],
  ]);

  const senderStatus = statusOfPeer(p2pInfos, "0a:e3:8f:d6:51:a2", "aa:bc:3a:74:37:b1");
  const receiverStatus = statusOfPeer(p2pInfos, "aa:bc:3a:74:37:b1", "0a:e3:8f:d6:51:a2");
  assert.equal(shouldAcceptSuccess(3, senderStatus, receiverStatus), false);

  // And once one side really promotes, the same report is banked.
  p2pInfos.get("0a:e3:8f:d6:51:a2").to[0].p2pStatus = P2P_FULLDUPLEX;
  assert.equal(
    shouldAcceptSuccess(
      3,
      statusOfPeer(p2pInfos, "0a:e3:8f:d6:51:a2", "aa:bc:3a:74:37:b1"),
      statusOfPeer(p2pInfos, "aa:bc:3a:74:37:b1", "0a:e3:8f:d6:51:a2")
    ),
    true
  );
});