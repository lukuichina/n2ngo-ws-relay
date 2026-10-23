import { encodeSNPublicSecret, decodeSNPublicSecret } from './src/core/packet.js';

// Test with various PemData lengths
const testCases = [
  { length: 0, name: 'empty' },
  { length: 5, name: '5-byte' },
  { length: 10, name: '10-byte' },
  { length: 16, name: '16-byte' },
  { length: 128, name: '128-byte' },
  { length: 256, name: '256-byte' },
  { length: 294, name: '294-byte' },
];

for (const tc of testCases) {
  const pubKey = new Uint8Array(tc.length);
  for (let i = 0; i < tc.length; i++) {
    pubKey[i] = i % 256;
  }
  
  // Test request (isRequest=true)
  const req = encodeSNPublicSecret(pubKey, true);
  console.log(`Request ${tc.name}: length=${req.length}`);
  
  // Test response (isRequest=false)
  const resp = encodeSNPublicSecret(pubKey, false);
  console.log(`Response ${tc.name}: length=${resp.length}`);
  
  // Try to decode
  try {
    const decoded = decodeSNPublicSecret(resp);
    console.log(`  Decoded: isRequest=${decoded.isRequest}, publicKey length=${decoded.publicKey.length}`);
    if (decoded.publicKey.length !== tc.length) {
      console.log(`  WARNING: length mismatch! Expected ${tc.length}, got ${decoded.publicKey.length}`);
    }
  } catch (e) {
    console.log(`  Decode error: ${e.message}`);
  }
  
  console.log('');
}
