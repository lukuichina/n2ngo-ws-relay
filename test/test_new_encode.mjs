// Test new encoding approach based on Go decoder analysis

function encodeSNPublicSecretV2(pubKey, isRequest = false) {
  const result = [];
  
  // 1. GOB version: 35 7f 03
  result.push(0x35, 0x7f, 0x03);
  
  // 2. Type descriptor for SNPublicSecret struct
  result.push(0x01, 0x01, 0x0e);
  result.push(...[0x53, 0x4e, 0x50, 0x75, 0x62, 0x6c, 0x69, 0x63, 0x53, 0x65, 0x63, 0x72, 0x65, 0x74]);
  result.push(0x01);
  
  // 3. B block for field descriptors (numFields = 0)
  result.push(0xff, 0x80, 0x00);
  
  // 4. Field 1 descriptor: IsRequest (bool)
  result.push(0x01);
  result.push(0x02, 0x01);
  result.push(0x09);
  result.push(...[0x49, 0x73, 0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74]);
  result.push(0x01);
  
  // 5. Field 2 descriptor: PemData ([]byte)
  result.push(0x02);
  result.push(0x00, 0x01);
  result.push(0x07);
  result.push(...[0x50, 0x65, 0x6d, 0x44, 0x61, 0x74, 0x61]);
  result.push(0x01);
  result.push(0x0a);
  
  // 6. Type ID (4 bytes little-endian)
  // For 10-byte PemData, Go uses 0x0f000000
  // For 294-byte PemData, Go uses 0xfe000000
  // This seems to vary, so let's try both
  const typeId = 0x0f000000; // Try 10-byte version first
  result.push(typeId & 0xff);
  result.push((typeId >> 8) & 0xff);
  result.push((typeId >> 16) & 0xff);
  result.push((typeId >> 24) & 0xff);
  
  // 7. Additional bytes: 01 2d
  result.push(0x01, 0x2d);
  
  // 8. Value B block
  if (isRequest) {
    // Request: IsRequest=true
    result.push(0xff, 0x80, 0x01);
    result.push(0x00); // IsRequest = false (omitted? no, it's true)
    result.push(0x01); // IsRequest = true
    // Then PemData...
  } else {
    // Response: IsRequest=false is omitted
    result.push(0xff, 0x80, 0x02);
    // IsRequest field: fe 01 26
    result.push(0xfe); // type ID reference
    result.push(0x01); // field delta = 1
    result.push(0x26); // omitted value placeholder
    // PemData field: 00 (start marker?)
    result.push(0x00);
    // Then raw PemData bytes
    result.push(...pubKey);
  }
  
  // 9. Struct terminator
  result.push(0x00);
  
  return new Uint8Array(result);
}

// Test with 10-byte PemData
const pubKey10 = new Uint8Array(10);
for (let i = 0; i < 10; i++) {
  pubKey10[i] = i + 1;
}

const encoded10 = encodeSNPublicSecretV2(pubKey10, false);
console.log('10-byte encoded length:', encoded10.length);
console.log('10-byte hex:', Array.from(encoded10).map(b => b.toString(16).padStart(2, '0')).join(' '));

// Compare with Go reference
const goRef10 = '297f0301010e534e5075626c696353656372657401ff800001020109497352657175657374010200010750656d44617461010a0000000fff80020a0102030405060708090a00';
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return arr;
}
const goBytes10 = hexToBytes(goRef10);
console.log('Go reference length:', goBytes10.length);
console.log('Go reference hex:', Array.from(goBytes10).map(b => b.toString(16).padStart(2, '0')).join(' '));

console.log('Match:', encoded10.length === goBytes10.length && encoded10.every((v, i) => v === goBytes10[i]));
