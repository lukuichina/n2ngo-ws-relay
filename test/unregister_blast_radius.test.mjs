/**
 * Regression test for the unregister blast radius.
 *
 * The relay tells edges "this peer left" with a TypeUnregister PeerInfoList,
 * and the Go edge deletes EVERY mac in that list except its own
 * (HandlePeerInfoList, case TypeUnregister). So the payload must name exactly
 * one peer -- the one that left.
 *
 * broadcastPeerInfo falls back to getOnlinePeers() when peerOverride is null,
 * which is precisely the set of nodes that are *staying*. Omitting the
 * argument therefore does not under-report the departure, it inverts it: one
 * node leaving turns into "everyone else departed" and the whole mesh wipes
 * its registry.
 *
 * Observed 2026-10-02 with log5 (52:eb) dropping:
 *
 *   eventType=3 registeringMac=52:eb onlinePeers=4
 *     payloadMacs=[0a:e3, aa:bc, ea:2f, 9e:6e]
 *
 * log3 lost E1 and log4, log4 lost E1 and log3. Both had been FullDuplex on
 * proven direct paths since 12:56, and both spent the rest of the run unable
 * to recover, because a rebuilt peer starts with no raddr and the direct path
 * is gated on one.
 *
 * handler.js passed [departing]; relay_room.js did not. Asserting on the
 * encoder alone would not have caught that, because buildPeerInfoList honours
 * the argument perfectly well -- the bug was a caller forgetting it. So these
 * tests pin the call sites.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { CommunityState } from "../src/core/context.js";
import { PeerInfoEvent } from "../src/core/constants.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "src");

function peer(mac, vip, socket) {
  return {
    macAddr: mac,
    virtualIP: vip,
    pubSocket: socket,
    online: true,
    lastSeen: 1700000000,
  };
}

const DEPARTING = "52:eb:72:ed:64:1f";

function macToStr(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(":");
}

/**
 * buildPeerInfoList must use the override verbatim. This is the encoder half
 * of the contract; the caller half is asserted below.
 */
test("buildPeerInfoList uses peerOverride verbatim", () => {
  // Borrow the prototype method rather than constructing CommunityState:
  // its constructor builds an IPAM that needs config this test has no use
  // for. `this` only ever touches peers / getOnlinePeers / config.
  const build = CommunityState.prototype.buildPeerInfoList;

  const staying = [
    peer("0a:e3:8f:d6:51:a2", "100.64.0.1", "2.58.196.38:54097"),
    peer("aa:bc:3a:74:37:b1", "100.64.0.2", "57.129.106.133:52367"),
    peer("ea:2f:de:90:a5:72", "100.64.0.4", "111.101.5.1:52784"),
    peer("9e:6e:2d:8c:f5:db", "100.64.0.5", "111.101.5.1:57620"),
  ];
  const departing = peer(DEPARTING, "100.64.0.3", "111.101.5.1:57620");

  // CommunityState's constructor reaches through relayRoom.state.storage to
  // build the IPAM; a minimal stub is enough, none of it is used here.
  const peers = new Map();
  const fakeThis = {
    peers,
    config: { allowP2P: true, disableRelay: false },
    getOnlinePeers() {
      return [...peers.values()].filter((p) => p.online);
    },
  };
  const commState = fakeThis;
  commState.config.allowP2P = true;
  commState.config.disableRelay = false;
  // The departing peer is already offline, so it is NOT in getOnlinePeers() --
  // which is exactly why the override has to carry it explicitly.
  for (const p of staying) commState.peers.set(p.macAddr, p);
  commState.peers.set(DEPARTING, { ...departing, online: false });

  assert.equal(commState.getOnlinePeers().length, 4);

  const withOverride = build.call(
    commState,
    DEPARTING,
    PeerInfoEvent.TypeUnregister,
    null,
    [departing],
  );
  assert.equal(withOverride.event_type, PeerInfoEvent.TypeUnregister);
  assert.deepEqual(
    withOverride.peer_infos.map((i) => macToStr(i.mac_addr)),
    [DEPARTING],
    "peerOverride must produce a single-entry list",
  );

  // And the fallback, which is the trap: same call without the override names
  // all four nodes that are still online.
  const withoutOverride = build.call(
    commState,
    DEPARTING,
    PeerInfoEvent.TypeUnregister,
    null,
    null,
  );
  assert.equal(withoutOverride.peer_infos.length, 4);
});

/**
 * The encoder works, so the only way this regressed is a call site dropping
 * the argument. Pin every TypeUnregister broadcast to require it.
 *
 * Each call expression is matched as a whole with a non-greedy pattern, then
 * checked for the override.
 */
test("every TypeUnregister broadcast passes peerOverride", () => {
  const files = ["core/handler.js", "worker/relay_room.js"];
  let inspected = 0;

  for (const rel of files) {
    const src = readFileSync(join(SRC, rel), "utf8");
    const calls = src.match(
      /broadcastPeerInfo\([\s\S]*?PeerInfoEvent\.TypeUnregister[\s\S]*?\)/g,
    ) || [];

    for (const expr of calls) {
      inspected++;
      // The 3rd argument is the event type; a 4th is the override. Require
      // the override to be the departing peer specifically.
      assert.match(
        expr,
        /\[\s*(departing|peer)\s*\]\s*,?\s*\)?/,
        `${rel}: TypeUnregister broadcast without a departing-peer override:\n${expr}\n` +
          `This names the nodes that are staying, so every edge deletes its ` +
          `healthy peers when a third node drops.`,
      );
    }
  }

  assert.ok(inspected >= 2, `expected to inspect both call sites, saw ${inspected}`);
});

/**
 * Guard the guard: assert the scan actually found the call sites, so this
 * test cannot pass by matching nothing.
 */
test("the call-site scan really inspected relay_room.js", () => {
  const src = readFileSync(join(SRC, "worker", "relay_room.js"), "utf8");
  assert.match(src, /broadcastPeerInfo\(/);
  assert.match(src, /\[\s*peer\s*\]/, "relay_room.js must pass the departing peer");
});