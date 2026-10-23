import { encodeSNPublicSecretGob } from './src/core/gob_encoder.js';

// Test 1: 10-byte PemData, IsRequest=true
const pubKey1 = new Uint8Array([0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a]);
const encoded1 = encodeSNPublicSecretGob(pubKey1, true);

console.log("Encoded:", Buffer.from(encoded1).toString('hex'));

// Inline decoder with extensive debug
function decodeDebug(buf) {
  let offset = 0;
  
  // Skip stream header
  if (buf.length >= 3 && buf[0] === 0x35 && buf[1] === 0x7f && buf[2] === 0x03) {
    offset = 3;
  }
  
  // Skip type descriptor
  if (buf.length >= offset + 2 && buf[offset] === 0x01 && buf[offset + 1] === 0x01) {
    offset += 2;
    const nameLen = buf[offset++];
    offset += nameLen;
    if (buf[offset] === 0x01) offset++;
  }
  
  // Skip field descriptors B block
  if (buf.length >= offset + 3 && buf[offset] === 0xff && buf[offset + 1] === 0x80 && buf[offset + 2] === 0x00) {
    offset += 3;
  }
  
  console.log("After B block, offset =", offset);
  
  // Skip field 1 descriptor
  let bytes = 0;
  do { bytes++; } while (buf[offset + bytes - 1] & 0x80);
  offset += bytes;
  console.log("After field 1 delta, offset =", offset, "delta bytes =", bytes);
  
  offset += 2; // type info
  const nameLen1 = buf[offset++];
  console.log("Field 1 name length:", nameLen1);
  offset += nameLen1;
  if (buf[offset] === 0x01) offset++;
  console.log("After field 1 descriptor, offset =", offset);
  
  // Skip field 2 descriptor
  bytes = 0;
  do { bytes++; } while (buf[offset + bytes - 1] & 0x80);
  offset += bytes;
  console.log("After field 2 delta, offset =", offset, "delta bytes =", bytes);
  
  offset += 2; // type info
  const nameLen2 = buf[offset++];
  console.log("Field 2 name length:", nameLen2);
  offset += nameLen2;
  if (buf[offset] === 0x01) offset++;
  console.log("After field 2 descriptor, offset =", offset);
  
  // Skip type code and type ID
  if (buf[offset] === 0x0a) {
    offset += 5;
  }
  console.log("After type code/ID, offset =", offset);
  
  // B block for field values
  console.log("B block bytes:", Buffer.from(buf.slice(offset, offset + 10)).toString('hex'));
  offset += 2; // skip ff 80
  const numFields = buf[offset];
  console.log("numFields:", numFields);
  offset++;
  
  let isRequest = false;
  let pemData = new Uint8Array(0);
  
  while (offset < buf.length) {
    const tag = buf[offset++];
    console.log("Tag at offset", offset - 1, ":", tag.toString(16).padStart(2, '0'));
    
    if (tag === 0x00) {
      console.log("Found terminator");
      break;
    } else if (tag === 0x01) {
      isRequest = buf[offset++] !== 0;
      console.log("IsRequest =", isRequest);
    } else if (tag === 0x0a) {
      console.log("Found byte array tag");
      const start = offset;
      while (offset < buf.length && buf[offset] !== 0x00) {
        offset++;
      }
      pemData = buf.slice(start, offset);
      console.log("PemData length:", pemData.length);
      if (offset < buf.length) {
        offset++; // skip terminator
      }
      break;
    } else {
      console.log("Unknown tag:", tag.toString(16));
      break;
    }
  }
  
  return { isRequest, publicKey: pemData };
}

const decoded = decodeDebug(encoded1);
console.log("Result:", decoded);
