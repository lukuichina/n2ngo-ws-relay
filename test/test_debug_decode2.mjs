import { encodeSNPublicSecretGob, decodeSNPublicSecretGob } from './src/core/gob_encoder.js';

// Test 1: 10-byte PemData, IsRequest=true
const pubKey1 = new Uint8Array([0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a]);
const encoded1 = encodeSNPublicSecretGob(pubKey1, true);

console.log("Encoded:", Buffer.from(encoded1).toString('hex'));

// Add debug to decoder
const buf = encoded1;
let offset = 0;

// Skip stream header
if (buf.length >= 3 && buf[0] === 0x35 && buf[1] === 0x7f && buf[2] === 0x03) {
  offset = 3;
  console.log("Skipped stream header, offset =", offset);
}

// Skip type descriptor
if (buf.length >= offset + 2 && buf[offset] === 0x01 && buf[offset + 1] === 0x01) {
  offset += 2;
  const nameLen = buf[offset++];
  console.log("Type name length:", nameLen);
  offset += nameLen;
  if (buf[offset] === 0x01) {
    offset++;
  }
  console.log("Skipped type descriptor, offset =", offset);
}

// Skip field descriptors B block
if (buf.length >= offset + 3 && buf[offset] === 0xff && buf[offset + 1] === 0x80 && buf[offset + 2] === 0x00) {
  offset += 3;
  console.log("Skipped field descriptors B block, offset =", offset);
}

// Skip field 1 descriptor
function skipFieldDescriptor(buf, offset) {
  let bytes = 0;
  do {
    bytes++;
  } while (buf[offset + bytes - 1] & 0x80);
  offset += bytes;
  offset += 2; // type info
  const nameLen = buf[offset++];
  offset += nameLen;
  if (buf[offset] === 0x01) offset++;
  return offset;
}

offset = skipFieldDescriptor(buf, offset);
console.log("Skipped field 1, offset =", offset);

offset = skipFieldDescriptor(buf, offset);
console.log("Skipped field 2, offset =", offset);

// Skip type code and type ID
if (buf[offset] === 0x0a) {
  offset += 5;
  console.log("Skipped type code and ID, offset =", offset);
}

// Check B block
console.log("B block bytes:", Buffer.from(buf.slice(offset, offset + 5)).toString('hex'));
console.log("Expected: ff 80 01...");

try {
  const decoded = decodeSNPublicSecretGob(encoded1);
  console.log("Decoded:", decoded);
} catch (e) {
  console.error("Error:", e.message);
}
