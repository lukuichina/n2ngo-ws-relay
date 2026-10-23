// Test current encode implementation
import { encodeSNPublicSecret, decodeSNPublicSecret } from './src/core/packet.js';

// Test with 294-byte PemData
const pubKey = new Uint8Array(294);
for (let i = 0; i < 294; i++) {
  pubKey[i] = (i + 1) % 256;
}

console.log('=== Testing encodeSNPublicSecret ===');
const encoded = encodeSNPublicSecret(pubKey, false);
console.log('Encoded length:', encoded.length);
console.log('First 70 bytes hex:');
for (let i = 0; i < 70; i++) {
  console.log(`  ${i}: 0x${encoded[i].toString(16).padStart(2, '0')}`);
}

console.log('\n=== Comparing with Go reference ===');
// Go reference (first 70 bytes)
const goRef = `357f0301010e534e5075626c696353656372657401ff800001020109497352657175657374010200010750656d44617461010a000000fe012dff8002fe0126000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20212223242500`;

function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return arr;
}

const goBytes = hexToBytes(goRef);
console.log('\nGo reference (first 70 bytes):');
for (let i = 0; i < 70; i++) {
  console.log(`  ${i}: 0x${goBytes[i].toString(16).padStart(2, '0')}`);
}

console.log('\n=== Differences ===');
let diffCount = 0;
for (let i = 0; i < Math.min(encoded.length, goBytes.length); i++) {
  if (encoded[i] !== goBytes[i]) {
    if (diffCount < 20) {
      console.log(`  Offset ${i}: Worker=0x${encoded[i].toString(16).padStart(2, '0')}, Go=0x${goBytes[i].toString(16).padStart(2, '0')}`);
    }
    diffCount++;
  }
}
console.log(`Total differences: ${diffCount}`);
console.log(`Worker length: ${encoded.length}, Go length: ${goBytes.length}`);
