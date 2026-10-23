import { encodeSNPublicSecret, decodeSNPublicSecret } from './src/core/packet.js';

// Test roundtrip with 10-byte PemData
const originalPubKey = new Uint8Array([0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,0x09,0x0a]);
console.log('Original PemData:', Array.from(originalPubKey));

// Encode
const encoded = encodeSNPublicSecret(originalPubKey, false);
console.log('Encoded length:', encoded.length);
console.log('Encoded hex:', Buffer.from(encoded).toString('hex'));

// Decode
const decoded = decodeSNPublicSecret(encoded);
console.log('Decoded PemData:', Array.from(decoded.publicKey));
console.log('Decoded isRequest:', decoded.isRequest);

// Check if they match
console.log('PemData match:', Buffer.from(decoded.publicKey).equals(originalPubKey));
