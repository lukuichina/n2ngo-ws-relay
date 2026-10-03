/**
 * Regression tests for decodePeerP2PInfos normalisation.
 *
 * The relay's only way to learn that a hole punch succeeded is
 * recordPunchResult(), which reads punchResult / punchResultPeerMac off the
 * normalised object returned by decodePeerP2PInfos. That function rebuilds
 * each `to` entry field by field, and it silently omitted those two fields
 * (proto 12 and 13). protos_generated.js decoded them correctly, so nothing
 * failed loudly -- the relay simply never saw a success, and kept
 * re-broadcasting instructions for pairs that were already up.
 *
 * p2pStatus (proto 15) has the same shape of problem, one level up: it is what
 * lets the relay tell a still-working success from a stale one.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import $root from "../src/core/protos_generated.js";
import { decodePeerP2PInfos } from "../src/core/packet.js";

const PEER_MAC = "52:eb:72:ed:64:1f";
const PEER_MAC_BYTES = Buffer.from(PEER_MAC.split(":").map((h) => parseInt(h, 16)));

function buildP2PInfos({ punchResult, punchResultPeerMac, p2pStatus }) {
  return $root.n2n.PeerP2PInfos.encode({
    from: {
      virtualIp: "100.64.0.3",
      macAddr: Buffer.from([0x9e, 0x6e, 0x2d, 0x8c, 0xf5, 0xdb]),
      p2pEndpoint: "192.168.10.7:45446",
      natType: "EasyNAT",
    },
    to: [
      {
        virtualIp: "100.64.0.4",
        macAddr: PEER_MAC_BYTES,
        p2pEndpoint: "192.168.10.13:45446",
        natType: "EasyNAT",
        observedRaddr: "172.22.1.17:45446",
        ...(punchResult !== undefined ? { punchResult: punchResult } : {}),
        ...(punchResultPeerMac !== undefined
          ? { punchResultPeerMac: punchResultPeerMac }
          : {}),
        ...(p2pStatus !== undefined ? { p2pStatus: p2pStatus } : {}),
      },
    ],
  }).finish();
}

test("punch outcome survives normalisation", () => {
  const buf = buildP2PInfos({
    punchResult: { state: 3, attempts: 1, detail: "verified by real data frame" },
    punchResultPeerMac: PEER_MAC,
    p2pStatus: 3,
  });

  const out = decodePeerP2PInfos(buf);
  assert.equal(out.to.length, 1);
  const peer = out.to[0];

  // The whole point: recordPunchResult's guard is
  // `if (t && t.punchResult && t.punchResultPeerMac)`.
  assert.ok(peer.punchResult, "punchResult must survive normalisation");
  assert.equal(peer.punchResult.state, 3);
  assert.equal(peer.punchResultPeerMac, PEER_MAC);
  assert.ok(peer.punchResult && peer.punchResultPeerMac, "recordPunchResult guard must pass");
});

test("p2pStatus survives normalisation", () => {
  const buf = buildP2PInfos({
    punchResult: { state: 3, attempts: 1, detail: "" },
    punchResultPeerMac: PEER_MAC,
    p2pStatus: 3,
  });
  assert.equal(decodePeerP2PInfos(buf).to[0].p2pStatus, 3);
});

test("absent punch fields normalise to a falsy value, not a throw", () => {
  const buf = buildP2PInfos({});
  const peer = decodePeerP2PInfos(buf).to[0];
  assert.equal(peer.punchResult, null);
  assert.equal(peer.punchResultPeerMac, "");
  assert.equal(peer.p2pStatus, 0);
});

test("pre-existing fields still decode", () => {
  const buf = buildP2PInfos({});
  const peer = decodePeerP2PInfos(buf).to[0];
  assert.equal(peer.observedRaddr, "172.22.1.17:45446");
  assert.equal(peer.p2pEndpoint, "192.168.10.13:45446");
});
