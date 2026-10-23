import { encodeSNPublicSecretGob } from './src/core/gob_encoder.js';

// Test 1: 10-byte PemData, IsRequest=true
const pubKey1 = new Uint8Array([0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a]);
const encoded1 = encodeSNPublicSecretGob(pubKey1, true);

console.log("Encoded:", Buffer.from(encoded1).toString('hex'));

// Manual decode with debug
function decodeDebug(buf) {
  let offset = 0;
  
  // Skip to B block for field values
  // ... (skip headers)
  
  // B block
  offset = 55;
  console.log("At B block, offset =", offset);
  console.log("Bytes:", Buffer.from(buf.slice(offset, offset + 10)).toString('hex'));
  
  offset += 2; // skip ff 80
  const numFields = buf[offset];
  console.log("numFields:", numFields);
  offset++;
  
  let isRequest = false;
  let pemData = new Uint8Array(0);
  
  while (offset < buf.length) {
    const tag = buf[offset++];
    console.log("Tag:", tag.toString(16).padStart(2, '0'));
    
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
