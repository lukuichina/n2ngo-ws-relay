import { encodeSNPublicSecret, decodeSNPublicSecret } from './src/core/packet.js';

// Test with 294-byte PemData
const pubKey = new Uint8Array(294);
for (let i = 0; i < 294; i++) {
  pubKey[i] = i % 256;
}

console.log('=== Testing encode/decode roundtrip ===');
const encoded = encodeSNPublicSecret(pubKey, false);
console.log('Encoded length:', encoded.length);

const decoded = decodeSNPublicSecret(encoded);
console.log('Decoded isRequest:', decoded.isRequest);
console.log('Decoded publicKey length:', decoded.publicKey.length);
console.log('Public keys match:', pubKey.length === decoded.publicKey.length && pubKey.every((v, i) => v === decoded.publicKey[i]));

// Also test with 10-byte PemData
const pubKey10 = new Uint8Array(10);
for (let i = 0; i < 10; i++) {
  pubKey10[i] = i + 1;
}

console.log('\n=== Testing 10-byte PemData ===');
const encoded10 = encodeSNPublicSecret(pubKey10, false);
console.log('Encoded length:', encoded10.length);

// Compare with Go reference for 10-byte
const goRef10 = `297f0301010e534e5075626c696353656372657401ff800001020109497352657175657374010200010750656d44617461010a0000000fff80020a0102030405060708090a00`;
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return arr;
}
const goBytes10 = hexToBytes(goRef10);
console.log('Go reference length:', goBytes10.length);
console.log('Match:', encoded10.length === goBytes10.length && encoded10.every((v, i) => v === goBytes10[i]));

const decoded10 = decodeSNPublicSecret(encoded10);
console.log('Decoded publicKey length:', decoded10.publicKey.length);
console.log('Decoded publicKey:', Array.from(decoded10.publicKey));
