import { encodeSNPublicSecretGob } from './src/core/gob_encoder.js';

// Test 2: 294-byte PemData, IsRequest=false
const pubKey2 = new Uint8Array(294);
for (let i = 0; i < 294; i++) pubKey2[i] = i % 256;
const encoded2 = encodeSNPublicSecretGob(pubKey2, false);

console.log("Worker length:", encoded2.length);

// Correct Go reference from encode_294.go
const goRef = "357f0301010e534e5075626c696353656372657401ff800001020109497352657175657374010200010750656d44617461010a000000fe012dff8002fe0126000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20212223242500";

console.log("Go ref length:", goRef.length / 2);

// Compare byte by byte
const workerHex = Buffer.from(encoded2).toString('hex');
console.log("\nFirst 100 bytes comparison:");
console.log("Worker: ", workerHex.substring(0, 100));
console.log("Go ref: ", goRef.substring(0, 100));

// Find first difference
let diffPos = -1;
for (let i = 0; i < Math.min(workerHex.length, goRef.length); i++) {
  if (workerHex[i] !== goRef[i]) {
    diffPos = i;
    break;
  }
}

if (diffPos >= 0) {
  console.log("\nFirst difference at byte", diffPos / 2);
  console.log("Worker: ...", workerHex.substring(Math.max(0, diffPos - 20), diffPos + 20));
  console.log("Go ref: ...", goRef.substring(Math.max(0, diffPos - 20), diffPos + 20));
} else {
  console.log("\nNo differences in first", workerHex.length, "bytes");
}
