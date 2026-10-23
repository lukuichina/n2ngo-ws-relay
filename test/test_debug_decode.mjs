import { decodeSNPublicSecretGob } from './src/core/gob_encoder.js';

// Test 1 bytes
const buf = new Uint8Array([
  0xff, 0x80, 0x01, 0x01, 0x01, 0x0a, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x00
]);

console.log("Testing decoder with:", Buffer.from(buf).toString('hex'));

try {
  const decoded = decodeSNPublicSecretGob(buf);
  console.log("Decoded:", decoded);
} catch (e) {
  console.error("Error:", e.message);
}
