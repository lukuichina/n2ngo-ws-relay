import assert from "node:assert/strict";
import { observedRaddrInvalidatedBy } from "../src/core/context.js";

// The relay keeps one record per MAC, and the MAC is derived from the machine id
// on the edge, so the record outlives the process that wrote it. observedRaddr
// describes a socket; a restarted peer's socket is closed, and so is the port
// in that address.
//
// Observed 2026-10-03, coordinateNatHole logging a peer whose record disagreed
// with itself:
//
//   eligible mac=ea:2f:de:90:a5:72 pubSocket=111.101.5.1:53781
//                     observedRaddr=111.101.5.1:63654
//
// :63654 was log3's port in the previous process. E1 and E2 punched it 101 and
// 81 times respectively and never once reached it.

// The regression: a mapping change retires the address.
assert.equal(
  observedRaddrInvalidatedBy(
    { pubSocket: "111.101.5.1:63654", observedRaddr: "111.101.5.1:63654" },
    { pubSocket: "111.101.5.1:53781" }
  ),
  true
);

// On-link observations are the ones that matter most: under SNAT they are the
// only address that reaches the peer at all, and they are the ones that survive
// into the next process as a stale record.
assert.equal(
  observedRaddrInvalidatedBy(
    { pubSocket: "111.101.5.1:60735", observedRaddr: "172.22.2.44:60735" },
    { pubSocket: "111.101.5.1:49570" }
  ),
  true
);

// An unchanged re-announcement must NOT drop it. Peers re-register and
// re-broadcast constantly; dating the expiry on those would blank the field on
// every tick, and on a symmetric NAT it is the only address worth having.
assert.equal(
  observedRaddrInvalidatedBy(
    { pubSocket: "111.101.5.1:53781", observedRaddr: "172.22.1.17:53781" },
    { pubSocket: "111.101.5.1:53781" }
  ),
  false
);

// Updates that do not mention a pubSocket leave it alone -- most updates are
// lastSeen.
assert.equal(
  observedRaddrInvalidatedBy(
    { pubSocket: "111.101.5.1:53781", observedRaddr: "172.22.1.17:53781" },
    { lastSeen: 1 }
  ),
  false
);

// A peer that has announced nothing, or reported no observation, has nothing to
// retire. The record must stay undefined rather than become "".
assert.equal(
  observedRaddrInvalidatedBy({ pubSocket: "111.101.5.1:53781" }, { pubSocket: "111.101.5.1:49570" }),
  false
);
assert.equal(
  observedRaddrInvalidatedBy({ pubSocket: "" }, { pubSocket: "111.101.5.1:49570" }),
  false
);
assert.equal(
  observedRaddrInvalidatedBy({ observedRaddr: "172.22.2.44:60735" }, { pubSocket: "111.101.5.1:49570" }),
  false
);

// An empty pubSocket in the update must not count as a change to nothing.
assert.equal(
  observedRaddrInvalidatedBy(
    { pubSocket: "111.101.5.1:53781", observedRaddr: "111.101.5.1:53781" },
    { pubSocket: "" }
  ),
  false
);

// Missing arguments, as when updatePeer is called before registration.
assert.equal(observedRaddrInvalidatedBy(undefined, { pubSocket: "1.2.3.4:5" }), false);
assert.equal(observedRaddrInvalidatedBy({ pubSocket: "1.2.3.4:5" }, undefined), false);

console.log("all observedRaddrInvalidatedBy cases pass");
