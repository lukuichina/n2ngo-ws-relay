import { encodeSNPublicSecret, decodeSNPublicSecret } from './src/core/packet.js';
import { readFileSync } from 'fs';

// Create 294-byte PemData
const pubKey = new Uint8Array(294);
for (let i = 0; i < 294; i++) {
  pubKey[i] = i % 256;
}

console.log("=== Testing 294-byte PemData Response ===");
const response = encodeSNPublicSecret(pubKey, false);
console.log("Worker response length:", response.length);

// Read Go reference
let goRef = new Uint8Array(0);
try {
  const hexStr = readFileSync('go_ref_294.txt', 'utf8').replace(/\s/g, '');
  goRef = new Uint8Array(hexStr.length / 2);
  for (let i = 0; i < hexStr.length; i += 2) {
    goRef[i / 2] = parseInt(hexStr.substr(i, 2), 16);
  }
  console.log("Go reference length:", goRef.length);
} catch (e) {
  console.error("Error reading go_ref_294.txt:", e.message);
}

// Compare
if (goRef.length > 0) {
  console.log("\n=== Differences ===");
  const minLen = Math.min(response.length, goRef.length);
  let diffCount = 0;
  for (let i = 0; i < minLen; i++) {
    if (response[i] !== goRef[i]) {
      diffCount++;
      if (diffCount <= 20) {
        console.log(`Offset ${i}: Worker=0x${response[i].toString(16).padStart(2,'0')} Go=0x${goRef[i].toString(16).padStart(2,'0')}`);
      }
    }
  }
  if (response.length !== goRef.length) {
    console.log(`Length diff: Worker=${response.length} Go=${goRef.length}`);
  }
  console.log(`Total differences: ${diffCount}`);
}

// Try decode
try {
  const decoded = decodeSNPublicSecret(response);
  console.log("\nDecoded:", decoded);
  console.log("Public key length:", decoded.publicKey.length);
} catch (e) {
  console.error("Decode error:", e.message);
}
