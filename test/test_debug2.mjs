import { encodeSNPublicSecretGob } from './src/core/gob_encoder.js';

const pubKey = new Uint8Array([0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a]);
const encoded = encodeSNPublicSecretGob(pubKey, true);

console.log("Full hex:", Buffer.from(encoded).toString('hex'));
console.log("\nBytes around field 2 descriptor:");
const start = 30; // approximate position
for (let i = start; i < Math.min(start + 20, encoded.length); i++) {
  console.log(`  Byte ${i}: 0x${encoded[i].toString(16).padStart(2, '0')}`);
}
