import { encodeSNPublicSecret, decodeSNPublicSecret } from './src/core/packet.js';

// Test with 10-byte PemData
const pubKey10 = new Uint8Array([0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,0x09,0x0a]);
const encoded10 = encodeSNPublicSecret(pubKey10, false);
const expected10 = '297f0301010e534e5075626c696353656372657401ff8000010101095075626c69634b6579010a0000000fff80010a0102030405060708090a00';

console.log('=== Test 1: 10-byte PemData ===');
console.log('Encoded:', Buffer.from(encoded10).toString('hex'));
console.log('Expected:', expected10);
console.log('Match:', Buffer.from(encoded10).toString('hex') === expected10);

// Test decode
const decoded10 = decodeSNPublicSecret(encoded10);
console.log('Decoded:', decoded10);
console.log('PublicKey match:', Buffer.from(decoded10.publicKey).equals(pubKey10));

// Test with 294-byte PemData (simulated)
const pubKey294 = new Uint8Array(294);
for (let i = 0; i < 294; i++) {
    pubKey294[i] = i % 256;
}
const encoded294 = encodeSNPublicSecret(pubKey294, false);
console.log('\n=== Test 2: 294-byte PemData ===');
console.log('Encoded length:', encoded294.length);
console.log('Encoded hex (first 60 bytes):', Buffer.from(encoded294.slice(0, 60)).toString('hex'));

// Test decode
const decoded294 = decodeSNPublicSecret(encoded294);
console.log('Decoded publicKey length:', decoded294.publicKey.length);
console.log('PublicKey match:', Buffer.from(decoded294.publicKey).equals(pubKey294));
